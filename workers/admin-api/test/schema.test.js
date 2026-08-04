import { validateSiteContent } from '../src/schema.js';
import test from 'node:test';
import assert from 'node:assert/strict';

test('rejects unknown top-level keys', () => {
  const r = validateSiteContent({ hack: true, notary: { price: '$1', stripe: '', paypal: '' } });
  assert.equal(r.ok, false);
});

test('accepts full valid payload', () => {
  const r = validateSiteContent({
    notary: { price: '$25', stripe: 'https://buy.stripe.com/x', paypal: 'https://www.paypal.com/x' },
    cpr: { price: '$85', stripe: '', paypal: '' },
    officiant: { deposit: '$150', stripe: '', paypal: '' },
    decoration: { deposit: '$150', stripe: '', paypal: '' },
    candleLeadTime: '5–7 days',
    candles: [
      { name: 'A', description: 'd', price: '$20', size: '8 oz', image: 'assets/candle-1.jpg', stripe: '', paypal: '' },
      { name: 'B', description: 'd', price: '$20', size: '8 oz', image: 'assets/candle-2.jpg', stripe: '', paypal: '' },
      { name: 'C', description: 'd', price: '$20', size: '8 oz', image: 'assets/candle-3.jpg', stripe: '', paypal: '' }
    ],
    misc: { notaryExpiration: '01/2030', hours: 'Mon–Sat 8am–8pm', youtube: '' }
  });
  assert.equal(r.ok, true);
  assert.equal(r.data.candles.length, 3);
});

test('rejects non-https payment url when non-empty', () => {
  const base = {
    notary: { price: '$25', stripe: 'https://buy.stripe.com/x', paypal: 'https://www.paypal.com/x' },
    cpr: { price: '$85', stripe: '', paypal: '' },
    officiant: { deposit: '$150', stripe: '', paypal: '' },
    decoration: { deposit: '$150', stripe: '', paypal: '' },
    candleLeadTime: '5–7 days',
    candles: [
      { name: 'A', description: 'd', price: '$20', size: '8 oz', image: 'assets/candle-1.jpg', stripe: '', paypal: '' },
      { name: 'B', description: 'd', price: '$20', size: '8 oz', image: 'assets/candle-2.jpg', stripe: '', paypal: '' },
      { name: 'C', description: 'd', price: '$20', size: '8 oz', image: 'assets/candle-3.jpg', stripe: '', paypal: '' }
    ],
    misc: { notaryExpiration: '01/2030', hours: 'Mon–Sat 8am–8pm', youtube: '' }
  };
  const r = validateSiteContent({ ...base, notary: { ...base.notary, stripe: 'http://evil.com/x' } });
  assert.equal(r.ok, false);
});
