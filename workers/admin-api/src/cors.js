export const ALLOWED_ORIGINS = new Set([
  'https://jeaneveillard.github.io',
  'http://localhost:5500',
  'http://127.0.0.1:5500',
]);

/**
 * @param {string | null} origin
 * @returns {Record<string, string>}
 */
export function corsHeadersForOrigin(origin) {
  const headers = {
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
  };
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
    headers.Vary = 'Origin';
  }
  return headers;
}
