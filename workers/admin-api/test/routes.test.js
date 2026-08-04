import test from 'node:test';
import assert from 'node:assert/strict';
import { signSession } from '../src/auth.js';
import worker, { resetRateLimitsForTests } from '../src/index.js';

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

test.beforeEach(() => {
  resetRateLimitsForTests();
});

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

test('save rate-limits after 20 attempts from the same IP', async () => {
  const token = await signSession('owner', baseEnv);
  const ipHeaders = {
    Authorization: `Bearer ${token}`,
    'CF-Connecting-IP': '203.0.113.50',
  };

  for (let i = 0; i < 20; i++) {
    const res = await worker.fetch(await saveRequest(ipHeaders), baseEnv);
    assert.equal(res.status, 503, `attempt ${i + 1} should reach GitHub check`);
  }

  const limited = await worker.fetch(await saveRequest(ipHeaders), baseEnv);
  assert.equal(limited.status, 429);
  const body = await limited.json();
  assert.match(body.error, /too many save/i);
});
