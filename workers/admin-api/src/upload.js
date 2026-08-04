export const MAX_UPLOAD_BYTES = 2 * 1024 * 1024;

const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

const EXT_BY_TYPE = {
  'image/jpeg': new Set(['.jpg', '.jpeg']),
  'image/png': new Set(['.png']),
  'image/webp': new Set(['.webp']),
};

/** Only candle-1|2|3 plus an allowed image extension. */
const CANDLE_UPLOAD_NAME = /^candle-[123]\.(jpg|jpeg|png|webp)$/;

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

/**
 * @param {string} name
 * @returns {string | null}
 */
export function safeAssetName(name) {
  if (typeof name !== 'string') {
    return null;
  }
  const base = name.split(/[/\\]/).pop();
  if (!base || !CANDLE_UPLOAD_NAME.test(base)) {
    return null;
  }
  return base;
}

/**
 * @param {Uint8Array} bytes
 * @param {string} contentType
 */
export function matchesImageMagic(bytes, contentType) {
  if (!(bytes instanceof Uint8Array) || bytes.byteLength < 3) {
    return false;
  }
  if (contentType === 'image/jpeg') {
    return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  }
  if (contentType === 'image/png') {
    return (
      bytes.byteLength >= 8
      && bytes[0] === 0x89
      && bytes[1] === 0x50
      && bytes[2] === 0x4e
      && bytes[3] === 0x47
      && bytes[4] === 0x0d
      && bytes[5] === 0x0a
      && bytes[6] === 0x1a
      && bytes[7] === 0x0a
    );
  }
  if (contentType === 'image/webp') {
    if (bytes.byteLength < 12) {
      return false;
    }
    const riff = String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3]);
    const webp = String.fromCharCode(bytes[8], bytes[9], bytes[10], bytes[11]);
    return riff === 'RIFF' && webp === 'WEBP';
  }
  return false;
}

function extensionOf(name) {
  const dot = name.lastIndexOf('.');
  if (dot <= 0 || dot === name.length - 1) {
    return '';
  }
  return name.slice(dot).toLowerCase();
}

/**
 * @param {{ name?: unknown, contentType?: unknown, contentBase64?: unknown }} body
 * @returns {{ ok: true, safeName: string, contentType: string, bytes: Uint8Array } | { ok: false, error: string }}
 */
export function validateUpload(body) {
  const safeName = safeAssetName(body?.name);
  if (!safeName) {
    return {
      ok: false,
      error: 'Invalid file name (must be candle-1, candle-2, or candle-3 with .jpg/.jpeg/.png/.webp)',
    };
  }

  const contentType = body?.contentType;
  if (!ALLOWED_IMAGE_TYPES.has(contentType)) {
    return { ok: false, error: 'contentType must be image/jpeg, image/png, or image/webp' };
  }

  const ext = extensionOf(safeName);
  const allowedExts = EXT_BY_TYPE[contentType];
  if (!allowedExts.has(ext)) {
    return { ok: false, error: `File extension must match contentType (${[...allowedExts].join(' or ')})` };
  }

  if (typeof body?.contentBase64 !== 'string' || body.contentBase64.length === 0) {
    return { ok: false, error: 'contentBase64 is required' };
  }

  const bytes = decodeBase64Bytes(body.contentBase64);
  if (!bytes) {
    return { ok: false, error: 'contentBase64 is invalid' };
  }
  if (bytes.byteLength > MAX_UPLOAD_BYTES) {
    return { ok: false, error: 'Image must be 2 MB or smaller' };
  }
  if (!matchesImageMagic(bytes, contentType)) {
    return { ok: false, error: 'File content does not match declared image type' };
  }

  return { ok: true, safeName, contentType, bytes };
}
