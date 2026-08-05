const SESSION_TTL_MS = 8 * 60 * 60 * 1000;
const MIN_PASSWORD_LENGTH = 8;

/** In-memory fallback when KV is not bound (local/tests). Not durable across isolates. */
const memoryOverrides = new Map();

function base64urlEncode(input) {
  const bytes = typeof input === 'string' ? new TextEncoder().encode(input) : input;
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64urlDecode(str) {
  return new TextDecoder().decode(base64urlDecodeToBytes(str));
}

function base64urlDecodeToBytes(str) {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  const pad = base64.length % 4;
  if (pad) {
    base64 += '='.repeat(4 - pad);
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function importHmacKey(secret) {
  return globalThis.crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  );
}

/** Fixed usernames (not secrets). Bootstrap passwords live in Worker secrets. */
export const ACCOUNTS = {
  andreelourdes: {
    role: 'owner',
    email: 'etienneandree@yahoo.com',
    passwordEnv: 'OWNER_PASSWORD',
  },
  amboul: {
    role: 'dev',
    email: 'jeaneveillard@gmail.com',
    passwordEnv: 'DEV_PASSWORD',
  },
};

export function normalizeUsername(username) {
  if (typeof username !== 'string') return '';
  return username.trim().toLowerCase();
}

export function normalizeEmail(email) {
  if (typeof email !== 'string') return '';
  return email.trim().toLowerCase();
}

export function getAccount(username) {
  const key = normalizeUsername(username);
  return key ? ACCOUNTS[key] || null : null;
}

export async function hashPassword(password, env) {
  if (typeof env?.SESSION_SECRET !== 'string' || env.SESSION_SECRET.length === 0) {
    throw new Error('SESSION_SECRET is required to hash passwords');
  }
  const data = new TextEncoder().encode(`${env.SESSION_SECRET}|${password}`);
  const digest = await globalThis.crypto.subtle.digest('SHA-256', data);
  return base64urlEncode(new Uint8Array(digest));
}

function overrideKey(username) {
  return `pw:${normalizeUsername(username)}`;
}

async function readOverrideHash(username, env) {
  const key = overrideKey(username);
  if (env?.PASSWORD_OVERRIDES?.get) {
    return env.PASSWORD_OVERRIDES.get(key);
  }
  return memoryOverrides.get(key) || null;
}

async function writeOverrideHash(username, hash, env) {
  const key = overrideKey(username);
  if (env?.PASSWORD_OVERRIDES?.put) {
    await env.PASSWORD_OVERRIDES.put(key, hash);
    return;
  }
  memoryOverrides.set(key, hash);
}

/** Test helper */
export function clearPasswordOverridesForTests() {
  memoryOverrides.clear();
}

export function validateNewPassword(password) {
  if (typeof password !== 'string' || password.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters`;
  }
  return null;
}

/**
 * @returns {Promise<{ role: 'owner' | 'dev', username: string, email: string } | null>}
 */
export async function resolveRole(username, password, env) {
  if (typeof password !== 'string' || password.length === 0) {
    return null;
  }

  const normalizedUser = normalizeUsername(username);
  const account = getAccount(normalizedUser);
  if (!account) {
    return null;
  }

  const overrideHash = await readOverrideHash(normalizedUser, env);
  if (overrideHash) {
    const candidate = await hashPassword(password, env);
    if (candidate !== overrideHash) {
      return null;
    }
  } else {
    const expectedPassword = env[account.passwordEnv];
    if (
      typeof expectedPassword !== 'string'
      || expectedPassword.length === 0
      || password !== expectedPassword
    ) {
      return null;
    }
  }

  return {
    role: account.role,
    username: normalizedUser,
    email: account.email,
  };
}

export async function setPasswordForUser(username, newPassword, env) {
  const normalized = normalizeUsername(username);
  const account = getAccount(normalized);
  if (!account) {
    return { ok: false, error: 'Unknown username' };
  }
  const bad = validateNewPassword(newPassword);
  if (bad) {
    return { ok: false, error: bad };
  }
  const hash = await hashPassword(newPassword, env);
  await writeOverrideHash(normalized, hash, env);
  return { ok: true };
}

export async function changePassword(username, oldPassword, newPassword, env) {
  const account = await resolveRole(username, oldPassword, env);
  if (!account) {
    return { ok: false, error: 'Current password is incorrect' };
  }
  return setPasswordForUser(account.username, newPassword, env);
}

export async function resetPassword(username, email, recoveryPassword, newPassword, env) {
  const account = getAccount(username);
  if (!account) {
    return { ok: false, error: 'Invalid account details' };
  }
  if (normalizeEmail(email) !== normalizeEmail(account.email)) {
    return { ok: false, error: 'Invalid account details' };
  }
  const recovery = env.RECOVERY_PASSWORD;
  if (
    typeof recovery !== 'string'
    || recovery.length === 0
    || typeof recoveryPassword !== 'string'
    || recoveryPassword !== recovery
  ) {
    return { ok: false, error: 'Invalid account details' };
  }
  return setPasswordForUser(normalizeUsername(username), newPassword, env);
}

export async function signSession(role, env, username = '') {
  const exp = Date.now() + SESSION_TTL_MS;
  const user = normalizeUsername(username);
  const payload = `${role}|${user}|${exp}`;
  const key = await importHmacKey(env.SESSION_SECRET);
  const sig = await globalThis.crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(payload),
  );
  return `${base64urlEncode(payload)}.${base64urlEncode(new Uint8Array(sig))}`;
}

export async function verifySession(token, env) {
  if (typeof token !== 'string') {
    return null;
  }

  const dot = token.indexOf('.');
  if (dot === -1) {
    return null;
  }

  const payloadB64 = token.slice(0, dot);
  const sigB64 = token.slice(dot + 1);
  if (!payloadB64 || !sigB64) {
    return null;
  }

  let payload;
  try {
    payload = base64urlDecode(payloadB64);
  } catch {
    return null;
  }

  const parts = payload.split('|');
  if (parts.length !== 3) {
    return null;
  }

  const [role, username, expRaw] = parts;
  if (role !== 'owner' && role !== 'dev') {
    return null;
  }

  const exp = Number(expRaw);
  if (!Number.isFinite(exp) || exp <= Date.now()) {
    return null;
  }

  let sigBytes;
  try {
    sigBytes = base64urlDecodeToBytes(sigB64);
  } catch {
    return null;
  }

  const key = await importHmacKey(env.SESSION_SECRET);
  const valid = await globalThis.crypto.subtle.verify(
    'HMAC',
    key,
    sigBytes,
    new TextEncoder().encode(payload),
  );
  if (!valid) {
    return null;
  }

  return { role, username: username || '' };
}
