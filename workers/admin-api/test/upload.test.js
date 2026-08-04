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

test('validateUpload accepts jpeg with matching extension and magic', () => {
  const r = validateUpload({
    name: 'photo.jpg',
    contentType: 'image/jpeg',
    contentBase64: b64(JPEG_MAGIC),
  });
  assert.equal(r.ok, true);
  assert.equal(r.safeName, 'photo.jpg');
  assert.equal(r.bytes.byteLength, JPEG_MAGIC.byteLength);
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

test('validateUpload strips path and keeps basename', () => {
  const r = validateUpload({
    name: '../photo.jpg',
    contentType: 'image/jpeg',
    contentBase64: b64(JPEG_MAGIC),
  });
  assert.equal(r.ok, true);
  assert.equal(r.safeName, 'photo.jpg');
});
test('validateUpload rejects wrong extension for contentType', () => {
  const r = validateUpload({
    name: 'photo.png',
    contentType: 'image/jpeg',
    contentBase64: b64(JPEG_MAGIC),
  });
  assert.equal(r.ok, false);
  assert.match(r.error, /extension/i);
});

test('validateUpload rejects missing image extension', () => {
  const r = validateUpload({
    name: 'photo',
    contentType: 'image/jpeg',
    contentBase64: b64(JPEG_MAGIC),
  });
  assert.equal(r.ok, false);
});

test('validateUpload rejects bad MIME', () => {
  const r = validateUpload({
    name: 'photo.gif',
    contentType: 'image/gif',
    contentBase64: b64(JPEG_MAGIC),
  });
  assert.equal(r.ok, false);
  assert.match(r.error, /contentType/i);
});

test('validateUpload rejects oversize payload', () => {
  const tooBig = new Uint8Array(2 * 1024 * 1024 + 1);
  tooBig[0] = 0xff;
  tooBig[1] = 0xd8;
  tooBig[2] = 0xff;
  const r = validateUpload({
    name: 'huge.jpg',
    contentType: 'image/jpeg',
    contentBase64: b64(tooBig),
  });
  assert.equal(r.ok, false);
  assert.match(r.error, /2 MB/i);
});

test('validateUpload rejects magic bytes mismatch', () => {
  const r = validateUpload({
    name: 'photo.jpg',
    contentType: 'image/jpeg',
    contentBase64: b64(PNG_MAGIC),
  });
  assert.equal(r.ok, false);
  assert.match(r.error, /content|magic|bytes|image/i);
});

test('validateUpload accepts png and webp', () => {
  assert.equal(
    validateUpload({
      name: 'a.png',
      contentType: 'image/png',
      contentBase64: b64(PNG_MAGIC),
    }).ok,
    true,
  );
  assert.equal(
    validateUpload({
      name: 'b.webp',
      contentType: 'image/webp',
      contentBase64: b64(WEBP_MAGIC),
    }).ok,
    true,
  );
  assert.equal(
    validateUpload({
      name: 'c.jpeg',
      contentType: 'image/jpeg',
      contentBase64: b64(JPEG_MAGIC),
    }).ok,
    true,
  );
});
