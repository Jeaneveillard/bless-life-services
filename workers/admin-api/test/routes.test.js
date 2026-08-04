import test from 'node:test';
import assert from 'node:assert/strict';
import { signSession } from '../src/auth.js';
import worker from '../src/index.js';

const baseEnv = {
  OWNER_PASSWORD: 'owner-secret',
  DEV_PASSWORD: 'dev-secret',
  SESSION_SECRET: 'session-secret-at-least-16',
  GITHUB_TOKEN: '',
  GITHUB_REPO: 'owner/repo',
  GITHUB_BRANCH: 'main',
};

async function saveRequest(headers = {}) {
  return new Request('http://localhost/api/save', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: JSON.stringify({}),
  });
}

test('save missing Bearer returns 401', async () => {
  const res = await worker.fetch(await saveRequest(), baseEnv);
  assert.equal(res.status, 401);
});

test('save invalid Bearer returns 401', async () => {
  const res = await worker.fetch(
    await saveRequest({ Authorization: 'Bearer not-a-valid-token' }),
    baseEnv,
  );
  assert.equal(res.status, 401);
});

test('save with valid session but missing GITHUB_TOKEN returns 503', async () => {
  const token = await signSession('dev', baseEnv);
  const res = await worker.fetch(
    await saveRequest({ Authorization: `Bearer ${token}` }),
    { ...baseEnv, GITHUB_TOKEN: '' },
  );
  assert.equal(res.status, 503);
  const body = await res.json();
  assert.match(body.error, /GITHUB_TOKEN/i);
});
