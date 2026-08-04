const SESSION_TTL_MS = 8 * 60 * 60 * 1000;

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

export function resolveRole(password, env) {
  if (typeof password !== 'string' || password.length === 0) {
    return null;
  }

  const ownerPassword = env.OWNER_PASSWORD;
  if (
    typeof ownerPassword === 'string'
    && ownerPassword.length > 0
    && password === ownerPassword
  ) {
    return 'owner';
  }

  const devPassword = env.DEV_PASSWORD;
  if (
    typeof devPassword === 'string'
    && devPassword.length > 0
    && password === devPassword
  ) {
    return 'dev';
  }

  return null;
}

export async function signSession(role, env) {
  const exp = Date.now() + SESSION_TTL_MS;
  const payload = `${role}|${exp}`;
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

  const sep = payload.lastIndexOf('|');
  if (sep === -1) {
    return null;
  }

  const role = payload.slice(0, sep);
  if (role !== 'owner' && role !== 'dev') {
    return null;
  }

  const exp = Number(payload.slice(sep + 1));
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

  return { role };
}
