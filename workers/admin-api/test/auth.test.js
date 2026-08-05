import test from 'node:test';
import assert from 'node:assert/strict';
import {
  changePassword,
  clearPasswordOverridesForTests,
  resetPassword,
  resolveRole,
  signSession,
  verifySession,
} from '../src/auth.js';

const env = {
  OWNER_PASSWORD: 'owner-secret',
  DEV_PASSWORD: 'dev-secret',
  RECOVERY_PASSWORD: 'recovery-secret',
  SESSION_SECRET: 'session-secret-at-least-16',
};

test.beforeEach(() => {
  clearPasswordOverridesForTests();
});

test('resolveRole owner and dev by username', async () => {
  assert.deepEqual(await resolveRole('andreelourdes', 'owner-secret', env), {
    role: 'owner',
    username: 'andreelourdes',
    email: 'etienneandree@yahoo.com',
  });
  assert.deepEqual(await resolveRole('amboul', 'dev-secret', env), {
    role: 'dev',
    username: 'amboul',
    email: 'jeaneveillard@gmail.com',
  });
  assert.equal(await resolveRole('amboul', 'nope', env), null);
  assert.equal(await resolveRole('unknown', 'owner-secret', env), null);
});

test('resolveRole normalizes username case', async () => {
  assert.equal((await resolveRole('AndreeLourdes', 'owner-secret', env))?.role, 'owner');
  assert.equal((await resolveRole(' AMBOUL ', 'dev-secret', env))?.username, 'amboul');
});

test('resolveRole rejects empty or missing credentials', async () => {
  assert.equal(await resolveRole('', 'owner-secret', env), null);
  assert.equal(await resolveRole('andreelourdes', '', env), null);
  assert.equal(await resolveRole(undefined, 'owner-secret', env), null);
});

test('changePassword updates login password', async () => {
  const changed = await changePassword('amboul', 'dev-secret', 'new-dev-pass', env);
  assert.equal(changed.ok, true);
  assert.equal(await resolveRole('amboul', 'dev-secret', env), null);
  assert.equal((await resolveRole('amboul', 'new-dev-pass', env))?.role, 'dev');
});

test('resetPassword requires matching email and recovery password', async () => {
  const bad = await resetPassword(
    'andreelourdes',
    'wrong@example.com',
    'recovery-secret',
    'brand-new-pw',
    env,
  );
  assert.equal(bad.ok, false);

  const ok = await resetPassword(
    'andreelourdes',
    'etienneandree@yahoo.com',
    'recovery-secret',
    'brand-new-pw',
    env,
  );
  assert.equal(ok.ok, true);
  assert.equal((await resolveRole('andreelourdes', 'brand-new-pw', env))?.role, 'owner');
  assert.equal(await resolveRole('andreelourdes', 'owner-secret', env), null);
});

test('sign and verify session includes username', async () => {
  const t = await signSession('dev', env, 'amboul');
  const v = await verifySession(t, env);
  assert.deepEqual(v, { role: 'dev', username: 'amboul' });
});
