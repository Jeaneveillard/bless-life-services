import test from 'node:test';
import assert from 'node:assert/strict';
import { buildNotarySheetHtml, validateNotaryQuote } from '../src/notaryQuote.js';

test('validateNotaryQuote accepts a full request', () => {
  const r = validateNotaryQuote({
    name: 'Jane Doe',
    email: 'jane@example.com',
    phone: '857-000-0000',
    need: 'Mortgage docs',
    location: 'Boston, MA',
    where: 'At your location (mobile notary)',
    date: '2026-09-01',
    message: 'Two signers',
  });
  assert.equal(r.ok, true);
  assert.equal(r.data.name, 'Jane Doe');
});

test('validateNotaryQuote rejects missing need', () => {
  const r = validateNotaryQuote({
    name: 'Jane',
    email: 'jane@example.com',
    location: 'Boston',
    where: 'At our location',
  });
  assert.equal(r.ok, false);
});

test('buildNotarySheetHtml includes branding and fields', () => {
  const html = buildNotarySheetHtml({
    name: 'Jane Doe',
    email: 'jane@example.com',
    phone: '',
    need: 'Deed',
    location: 'Cambridge',
    where: 'At our location',
    date: '',
    message: '',
  }, 'Aug 4, 2026, 9:00 PM', { forEmail: true });
  assert.match(html, /Bless Life Services LLC/);
  assert.match(html, /Jane Doe/);
  assert.match(html, /Deed/);
  assert.match(html, /Date filled \(archive\)/);
  assert.match(html, /Aug 4, 2026, 9:00 PM/);
  assert.match(html, /class="archive"/);
  assert.doesNotMatch(html, /window\.print/);
});
