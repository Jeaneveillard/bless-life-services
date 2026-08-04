import { resolveRole, signSession, verifySession } from './auth.js';
import { getFile, putBinary, putFile } from './github.js';
import { validateSiteContent } from './schema.js';

const ALLOWED = new Set([
  'https://jeaneveillard.github.io',
  'http://localhost:5500',
  'http://127.0.0.1:5500',
]);

const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_MAX_ATTEMPTS = 20;
const MAX_UPLOAD_BYTES = 2 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const SAFE_NAME_PATTERN = /^[A-Za-z0-9._-]+$/;

/** @type {Map<string, { count: number, reset: number }>} */
const loginAttempts = new Map();

function corsHeaders(request) {
  const origin = request.headers.get('Origin');
  const headers = {
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
  };
  if (origin && ALLOWED.has(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
    headers.Vary = 'Origin';
  }
  return headers;
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

function isLoginRateLimited(ip) {
  const now = Date.now();
  const entry = loginAttempts.get(ip);
  if (!entry || now >= entry.reset) {
    loginAttempts.set(ip, { count: 1, reset: now + LOGIN_WINDOW_MS });
    return false;
  }
  entry.count += 1;
  if (entry.count > LOGIN_MAX_ATTEMPTS) {
    return true;
  }
  return false;
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

function safeAssetName(name) {
  if (typeof name !== 'string') {
    return null;
  }
  const base = name.split(/[/\\]/).pop();
  if (!base || !SAFE_NAME_PATTERN.test(base)) {
    return null;
  }
  return base;
}

function decodeBase64Bytes(b64) {
  try {
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  } catch {
    return null;
  }
}

async function handleLogin(request, env) {
  const ip = clientIp(request);
  if (isLoginRateLimited(ip)) {
    return json(request, 429, { error: 'Too many login attempts. Try again later.' });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json(request, 400, { error: 'Invalid JSON body' });
  }

  const role = resolveRole(body?.password, env);
  if (!role) {
    return json(request, 401, { error: 'Invalid password' });
  }

  const token = await signSession(role, env);
  return json(request, 200, { token, role });
}

async function handleSave(request, env) {
  const session = await requireAuth(request, env);
  if (!session) {
    return json(request, 401, { error: 'Unauthorized' });
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

  const safeName = safeAssetName(body?.name);
  if (!safeName) {
    return json(request, 400, { error: 'Invalid file name' });
  }

  const contentType = body?.contentType;
  if (!ALLOWED_IMAGE_TYPES.has(contentType)) {
    return json(request, 400, { error: 'contentType must be image/jpeg, image/png, or image/webp' });
  }

  if (typeof body?.contentBase64 !== 'string' || body.contentBase64.length === 0) {
    return json(request, 400, { error: 'contentBase64 is required' });
  }

  const bytes = decodeBase64Bytes(body.contentBase64);
  if (!bytes) {
    return json(request, 400, { error: 'contentBase64 is invalid' });
  }
  if (bytes.byteLength > MAX_UPLOAD_BYTES) {
    return json(request, 400, { error: 'Image must be 2 MB or smaller' });
  }

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
    if (url.pathname === '/api/save') {
      return handleSave(request, env);
    }
    if (url.pathname === '/api/upload') {
      return handleUpload(request, env);
    }

    return json(request, 404, { error: 'Not found' });
  },
};
