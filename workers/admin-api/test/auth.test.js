import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveRole, signSession, verifySession } from '../src/auth.js';

const env = {
  OWNER_PASSWORD: 'owner-secret',
  DEV_PASSWORD: 'dev-secret',
  SESSION_SECRET: 'session-secret-at-least-16',
};

test('resolveRole owner and dev', () => {
  assert.equal(resolveRole('owner-secret', env), 'owner');
  assert.equal(resolveRole('dev-secret', env), 'dev');
  assert.equal(resolveRole('nope', env), null);
});

test('sign and verify session', async () => {
  const t = await signSession('dev', env);
  const v = await verifySession(t, env);
  assert.deepEqual(v, { role: 'dev' });
});
