import test from 'node:test';
import assert from 'node:assert/strict';
import { corsHeadersForOrigin } from '../src/cors.js';

test('allowed Origin gets Access-Control-Allow-Origin', () => {
  const headers = corsHeadersForOrigin('http://localhost:5500');
  assert.equal(headers['Access-Control-Allow-Origin'], 'http://localhost:5500');
  assert.equal(headers.Vary, 'Origin');
});

test('disallowed Origin does not get Access-Control-Allow-Origin', () => {
  const headers = corsHeadersForOrigin('https://evil.example');
  assert.equal(headers['Access-Control-Allow-Origin'], undefined);
  assert.ok(headers['Access-Control-Allow-Methods']);
});

test('missing Origin does not get Access-Control-Allow-Origin', () => {
  const headers = corsHeadersForOrigin(null);
  assert.equal(headers['Access-Control-Allow-Origin'], undefined);
});
