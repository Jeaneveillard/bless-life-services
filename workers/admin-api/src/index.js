import { changePassword, resetPassword, resolveRole, signSession, verifySession } from './auth.js';
import { corsHeadersForOrigin } from './cors.js';
import { getFile, putBinary, putFile } from './github.js';
import { sendNotaryQuoteEmail, validateNotaryQuote } from './notaryQuote.js';
import { validateSiteContent } from './schema.js';
import { validateUpload } from './upload.js';

const RATE_WINDOW_MS = 15 * 60 * 1000;
const RATE_MAX_ATTEMPTS = 20;

/** @type {Map<string, { count: number, reset: number }>} */
const rateBuckets = new Map();

function corsHeaders(request) {
  return corsHeadersForOrigin(request.headers.get('Origin'));
}

function json(request, status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...corsHeaders(request),
    },
  });
}

function clientIp(request) {
  return (
    request.headers.get('CF-Connecting-IP')
    || request.headers.get('X-Forwarded-For')?.split(',')[0]?.trim()
    || 'unknown'
  );
}

/**
 * In-memory, per-isolate rate limit (not shared across Cloudflare isolates).
 * @param {'login' | 'save' | 'upload' | 'notary-quote'} kind
 * @param {string} ip
 */
function isRateLimited(kind, ip) {
  const key = `${kind}:${ip}`;
  const now = Date.now();
  const entry = rateBuckets.get(key);
  if (!entry || now >= entry.reset) {
    rateBuckets.set(key, { count: 1, reset: now + RATE_WINDOW_MS });
    return false;
  }
  entry.count += 1;
  if (entry.count > RATE_MAX_ATTEMPTS) {
    return true;
  }
  return false;
}

/** Test helper — clears in-memory rate-limit buckets. */
export function resetRateLimitsForTests() {
  rateBuckets.clear();
}

function requireGithubToken(env) {
  if (typeof env.GITHUB_TOKEN !== 'string' || env.GITHUB_TOKEN.length === 0) {
    return 'GitHub integration is not configured (GITHUB_TOKEN missing)';
  }
  return null;
}

async function requireAuth(request, env) {
  const header = request.headers.get('Authorization') || '';
  const match = /^Bearer\s+(.+)$/i.exec(header);
  if (!match) {
    return null;
  }
  return verifySession(match[1].trim(), env);
}

async function handleLogin(request, env) {
  const ip = clientIp(request);
  if (isRateLimited('login', ip)) {
    return json(request, 429, { error: 'Too many login attempts. Try again later.' });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json(request, 400, { error: 'Invalid JSON body' });
  }

  const account = await resolveRole(body?.username, body?.password, env);
  if (!account) {
    return json(request, 401, { error: 'Invalid username or password' });
  }

  const token = await signSession(account.role, env, account.username);
  return json(request, 200, {
    token,
    role: account.role,
    username: account.username,
    email: account.email,
  });
}

async function handleChangePassword(request, env) {
  const session = await requireAuth(request, env);
  if (!session?.username) {
    return json(request, 401, { error: 'Unauthorized' });
  }

  const ip = clientIp(request);
  if (isRateLimited('login', ip)) {
    return json(request, 429, { error: 'Too many attempts. Try again later.' });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json(request, 400, { error: 'Invalid JSON body' });
  }

  const result = await changePassword(
    session.username,
    body?.oldPassword,
    body?.newPassword,
    env,
  );
  if (!result.ok) {
    return json(request, 400, { error: result.error });
  }
  return json(request, 200, { ok: true });
}

async function handleResetPassword(request, env) {
  const ip = clientIp(request);
  if (isRateLimited('login', ip)) {
    return json(request, 429, { error: 'Too many attempts. Try again later.' });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json(request, 400, { error: 'Invalid JSON body' });
  }

  const result = await resetPassword(
    body?.username,
    body?.email,
    body?.recoveryPassword,
    body?.newPassword,
    env,
  );
  if (!result.ok) {
    return json(request, 400, { error: result.error });
  }
  return json(request, 200, { ok: true });
}

async function handleSave(request, env) {
  const session = await requireAuth(request, env);
  if (!session) {
    return json(request, 401, { error: 'Unauthorized' });
  }

  const ip = clientIp(request);
  if (isRateLimited('save', ip)) {
    return json(request, 429, { error: 'Too many save attempts. Try again later.' });
  }

  const missing = requireGithubToken(env);
  if (missing) {
    return json(request, 503, { error: missing });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json(request, 400, { error: 'Invalid JSON body' });
  }

  const validated = validateSiteContent(body);
  if (!validated.ok) {
    return json(request, 400, { error: validated.error });
  }

  const path = 'content/site.json';
  const contentText = `${JSON.stringify(validated.data, null, 2)}\n`;
  const message = `Update site content (admin:${session.role})`;

  try {
    const existing = await getFile(env, path);
    await putFile(env, path, contentText, existing.sha, message);
  } catch (err) {
    const status = err?.status === 503 ? 503 : err?.status === 404 ? 404 : 502;
    return json(request, status, {
      error: err?.message || 'Failed to save content to GitHub',
    });
  }

  return json(request, 200, { ok: true });
}

async function handleUpload(request, env) {
  const session = await requireAuth(request, env);
  if (!session) {
    return json(request, 401, { error: 'Unauthorized' });
  }

  const ip = clientIp(request);
  if (isRateLimited('upload', ip)) {
    return json(request, 429, { error: 'Too many upload attempts. Try again later.' });
  }

  const missing = requireGithubToken(env);
  if (missing) {
    return json(request, 503, { error: missing });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json(request, 400, { error: 'Invalid JSON body' });
  }

  const validated = validateUpload(body);
  if (!validated.ok) {
    return json(request, 400, { error: validated.error });
  }

  const { safeName, contentType, bytes } = validated;
  const path = `assets/${safeName}`;
  const message = `Upload ${path} (admin:${session.role})`;

  try {
    let sha = null;
    try {
      const existing = await getFile(env, path);
      sha = existing.sha;
    } catch (err) {
      if (err?.githubStatus !== 404 && err?.status !== 404) {
        throw err;
      }
    }
    await putBinary(env, path, bytes, sha, message, contentType);
  } catch (err) {
    const status = err?.status === 503 ? 503 : 502;
    return json(request, status, {
      error: err?.message || 'Failed to upload asset to GitHub',
    });
  }

  return json(request, 200, { path });
}

async function handleNotaryQuote(request, env) {
  const ip = clientIp(request);
  if (isRateLimited('notary-quote', ip)) {
    return json(request, 429, { error: 'Too many quote requests. Try again later.' });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json(request, 400, { error: 'Invalid JSON body' });
  }

  const validated = validateNotaryQuote(body);
  if (!validated.ok) {
    return json(request, 400, { error: validated.error });
  }

  const sent = await sendNotaryQuoteEmail(validated.data, env);
  if (!sent.ok) {
    return json(request, sent.status || 502, { error: sent.error });
  }

  return json(request, 200, { ok: true, filledAt: sent.filledAt || null });
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(request) });
    }

    if (request.method !== 'POST') {
      return json(request, 405, { error: 'Method not allowed' });
    }

    const url = new URL(request.url);
    if (url.pathname === '/api/login') {
      return handleLogin(request, env);
    }
    if (url.pathname === '/api/change-password') {
      return handleChangePassword(request, env);
    }
    if (url.pathname === '/api/reset-password') {
      return handleResetPassword(request, env);
    }
    if (url.pathname === '/api/notary-quote') {
      return handleNotaryQuote(request, env);
    }
    if (url.pathname === '/api/save') {
      return handleSave(request, env);
    }
    if (url.pathname === '/api/upload') {
      return handleUpload(request, env);
    }

    return json(request, 404, { error: 'Not found' });
  },
};
