import test from 'node:test';
import assert from 'node:assert/strict';
import { validateUpload } from '../src/upload.js';

function b64(bytes) {
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

const JPEG_MAGIC = new Uint8Array([0xff, 0xd8, 0xff, 0xd9]);
const PNG_MAGIC = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);
const WEBP_MAGIC = new Uint8Array([
  0x52, 0x49, 0x46, 0x46, 0x08, 0x00, 0x00, 0x00,
  0x57, 0x45, 0x42, 0x50, 0x00,
]);

test('validateUpload accepts candle-1.jpg with matching magic', () => {
  const r = validateUpload({
    name: 'candle-1.jpg',
    contentType: 'image/jpeg',
    contentBase64: b64(JPEG_MAGIC),
  });
  assert.equal(r.ok, true);
  assert.equal(r.safeName, 'candle-1.jpg');
  assert.equal(r.bytes.byteLength, JPEG_MAGIC.byteLength);
});

test('validateUpload rejects non-candle basenames', () => {
  for (const name of ['photo.jpg', 'candle-4.jpg', 'candle-1.gif', 'Candle-1.jpg', 'logo.png']) {
    const r = validateUpload({
      name,
      contentType: 'image/jpeg',
      contentBase64: b64(JPEG_MAGIC),
    });
    assert.equal(r.ok, false, `expected reject for ${name}`);
    assert.match(r.error, /candle-1|candle-2|candle-3|Invalid file name/i);
  }
});

test('validateUpload rejects . and .. names', () => {
  for (const name of ['.', '..', 'foo/..']) {
    const r = validateUpload({
      name,
      contentType: 'image/jpeg',
      contentBase64: b64(JPEG_MAGIC),
    });
    assert.equal(r.ok, false, `expected reject for ${name}`);
  }
});

test('validateUpload strips path and keeps candle basename', () => {
  const r = validateUpload({
    name: '../candle-2.jpg',
    contentType: 'image/jpeg',
    contentBase64: b64(JPEG_MAGIC),
  });
  assert.equal(r.ok, true);
  assert.equal(r.safeName, 'candle-2.jpg');
});

test('validateUpload rejects wrong extension for contentType', () => {
  const r = validateUpload({
    name: 'candle-1.png',
    contentType: 'image/jpeg',
    contentBase64: b64(JPEG_MAGIC),
  });
  assert.equal(r.ok, false);
  assert.match(r.error, /extension/i);
});

test('validateUpload rejects missing image extension', () => {
  const r = validateUpload({
    name: 'candle-1',
    contentType: 'image/jpeg',
    contentBase64: b64(JPEG_MAGIC),
  });
  assert.equal(r.ok, false);
});

test('validateUpload rejects bad MIME', () => {
  const r = validateUpload({
    name: 'candle-1.gif',
    contentType: 'image/gif',
    contentBase64: b64(JPEG_MAGIC),
  });
  assert.equal(r.ok, false);
  assert.match(r.error, /contentType|Invalid file name/i);
});

test('validateUpload rejects oversize payload', () => {
  const tooBig = new Uint8Array(2 * 1024 * 1024 + 1);
  tooBig[0] = 0xff;
  tooBig[1] = 0xd8;
  tooBig[2] = 0xff;
  const r = validateUpload({
    name: 'candle-3.jpg',
    contentType: 'image/jpeg',
    contentBase64: b64(tooBig),
  });
  assert.equal(r.ok, false);
  assert.match(r.error, /2 MB/i);
});

test('validateUpload rejects magic bytes mismatch', () => {
  const r = validateUpload({
    name: 'candle-1.jpg',
    contentType: 'image/jpeg',
    contentBase64: b64(PNG_MAGIC),
  });
  assert.equal(r.ok, false);
  assert.match(r.error, /content|magic|bytes|image/i);
});

test('validateUpload accepts png jpeg webp candle names', () => {
  assert.equal(
    validateUpload({
      name: 'candle-1.png',
      contentType: 'image/png',
      contentBase64: b64(PNG_MAGIC),
    }).ok,
    true,
  );
  assert.equal(
    validateUpload({
      name: 'candle-2.webp',
      contentType: 'image/webp',
      contentBase64: b64(WEBP_MAGIC),
    }).ok,
    true,
  );
  assert.equal(
    validateUpload({
      name: 'candle-3.jpeg',
      contentType: 'image/jpeg',
      contentBase64: b64(JPEG_MAGIC),
    }).ok,
    true,
  );
});
