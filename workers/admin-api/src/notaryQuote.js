const NOTARY_TO = 'etienneandree@yahoo.com';
const SITE_URL = 'https://jeaneveillard.github.io/bless-life-services';
const LOGO_URL = `${SITE_URL}/assets/logo.png`;

function escapeHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * @param {unknown} input
 * @returns {{ ok: true, data: Record<string, string> } | { ok: false, error: string }}
 */
export function validateNotaryQuote(input) {
  if (!input || typeof input !== 'object') {
    return { ok: false, error: 'Invalid request body' };
  }
  const required = ['name', 'email', 'need', 'location', 'where'];
  const data = {};
  for (const key of required) {
    const value = typeof input[key] === 'string' ? input[key].trim() : '';
    if (!value) {
      return { ok: false, error: `Missing field: ${key}` };
    }
    data[key] = value;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    return { ok: false, error: 'Invalid email address' };
  }
  data.phone = typeof input.phone === 'string' ? input.phone.trim() : '';
  data.date = typeof input.date === 'string' ? input.date.trim() : '';
  data.message = typeof input.message === 'string' ? input.message.trim() : '';
  return { ok: true, data };
}

function sheetRows(data, stamped) {
  return [
    ['Date filled (archive)', stamped],
    ['Full name', data.name],
    ['Email', data.email],
    ['Phone', data.phone || '—'],
    ['What needs notarizing', data.need],
    ['Appointment location', data.location],
    ['Meeting place', data.where],
    ['Preferred appointment date', data.date || 'flexible'],
    ['Additional notes', data.message || '—'],
  ];
}

/**
 * Printable / email HTML sheet for Andrée only.
 * @param {Record<string, string>} data
 * @param {string} stamped
 * @param {{ forEmail?: boolean }} [opts]
 */
export function buildNotarySheetHtml(data, stamped, opts = {}) {
  const forEmail = Boolean(opts.forEmail);
  const rowsHtml = sheetRows(data, stamped).map(([label, value]) => (
    `<tr><th>${escapeHtml(label)}</th><td>${escapeHtml(value).replace(/\n/g, '<br>')}</td></tr>`
  )).join('');

  const printBits = forEmail
    ? ''
    : [
      '<div class="actions">',
      '<button type="button" onclick="window.print()">Print this sheet</button>',
      '</div>',
      '<script>window.addEventListener("load",function(){setTimeout(function(){window.print()},250)});<\/script>',
    ].join('');

  return [
    '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8">',
    '<title>Notary quote request — Bless Life Services LLC</title>',
    '<style>',
    '*{box-sizing:border-box}',
    'body{font-family:Georgia,"Times New Roman",serif;color:#0a1020;margin:0;padding:1.25rem;background:#fff}',
    '.sheet{max-width:720px;margin:0 auto;border:1px solid #c9c4b8;padding:0;overflow:hidden}',
    '.header{display:flex;align-items:center;gap:1rem;padding:1.1rem 1.4rem;border-bottom:2px solid #0d2350;background:#fbf8f2}',
    '.header img{height:52px;width:auto;display:block}',
    '.header__text strong{display:block;font-size:1.15rem;color:#0d2350;line-height:1.2}',
    '.header__text span{display:block;font-size:.78rem;letter-spacing:.12em;text-transform:uppercase;color:#8a7350;margin-top:.2rem;font-family:Helvetica,Arial,sans-serif}',
    '.body{padding:1.35rem 1.5rem 1.5rem}',
    'h1{font-size:1.45rem;margin:0 0 .35rem;color:#0d2350}',
    '.meta{font-size:.9rem;color:#4a5568;margin:0 0 1.15rem;font-family:Helvetica,Arial,sans-serif}',
    '.archive{margin:0 0 1.15rem;padding:.85rem 1rem;border:2px solid #0d2350;background:#f7f3ea;font-family:Helvetica,Arial,sans-serif}',
    '.archive__label{display:block;font-size:.68rem;letter-spacing:.1em;text-transform:uppercase;color:#0d2350;font-weight:700;margin:0 0 .25rem}',
    '.archive__value{display:block;font-size:1.15rem;color:#0a1020;font-weight:700}',
    'table{width:100%;border-collapse:collapse;font-family:Helvetica,Arial,sans-serif;font-size:.95rem}',
    'th,td{border-top:1px solid #ddd6c8;padding:.7rem .2rem;vertical-align:top;text-align:left}',
    'th{width:34%;color:#0d2350;font-size:.72rem;letter-spacing:.08em;text-transform:uppercase}',
    'td{white-space:pre-wrap;word-break:break-word}',
    '.actions{margin:1.25rem 0 0}',
    'button{font:inherit;font-weight:700;padding:.65rem 1.1rem;border-radius:8px;border:1px solid #0d2350;background:#0d2350;color:#fff;cursor:pointer}',
    '.footer{margin-top:1.4rem;padding:1rem 1.5rem 1.15rem;border-top:1px solid #c9c4b8;background:#f7f3ea;font-family:Helvetica,Arial,sans-serif;font-size:.8rem;color:#4a5568;line-height:1.5}',
    '.footer strong{color:#0d2350}',
    '.footer a{color:#0d2350;text-decoration:none}',
    '.footer__line{margin:0 0 .35rem}',
    '.footer__disc{margin:.55rem 0 0;font-size:.72rem;color:#6b7280}',
    '@media print{body{padding:0}.actions{display:none!important}.sheet{border:none}.header{background:#fff}}',
    '</style></head><body>',
    '<div class="sheet">',
    '<header class="header">',
    `<img src="${escapeHtml(LOGO_URL)}" alt="Bless Life Services LLC" width="80" height="65">`,
    '<div class="header__text">',
    '<strong>Bless Life Services LLC</strong>',
    '<span>Notary Public · Massachusetts</span>',
    '</div>',
    '</header>',
    '<div class="body">',
    '<h1>Notary quote request</h1>',
    '<p class="meta">Office copy for Andrée Lourdes only · keep for archive</p>',
    '<div class="archive">',
    '<span class="archive__label">Date filled (archive)</span>',
    `<span class="archive__value">${escapeHtml(stamped)}</span>`,
    '</div>',
    `<table>${rowsHtml}</table>`,
    printBits,
    '</div>',
    '<footer class="footer">',
    '<p class="footer__line"><strong>Bless Life Services LLC</strong> · Massachusetts, USA</p>',
    '<p class="footer__line">Phone: <a href="tel:+18573739518">857-373-9518</a> · Email: <a href="mailto:etienneandree@yahoo.com">etienneandree@yahoo.com</a></p>',
    `<p class="footer__line">Web: ${SITE_URL.replace('https://', '')}</p>`,
    '<p class="footer__disc">Bless Life Services LLC is not a law firm and does not provide legal advice. A notary public may not draft, select or explain legal documents.</p>',
    '</footer>',
    '</div>',
    '</body></html>',
  ].join('');
}

function utf8ToBase64(text) {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

/**
 * Send quote email to Andrée only: HTML body + printable HTML attachment.
 * @param {Record<string, string>} data
 * @param {Record<string, string | undefined>} env
 */
export async function sendNotaryQuoteEmail(data, env) {
  const apiKey = env.RESEND_API_KEY;
  if (typeof apiKey !== 'string' || apiKey.length === 0) {
    return {
      ok: false,
      status: 503,
      error: 'Email delivery is not configured (RESEND_API_KEY missing).',
    };
  }

  const from = (typeof env.RESEND_FROM === 'string' && env.RESEND_FROM.length > 0)
    ? env.RESEND_FROM
    : 'Bless Life Services <onboarding@resend.dev>';

  const stamped = new Date().toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'America/New_York',
  });

  const sheetHtml = buildNotarySheetHtml(data, stamped, { forEmail: true });
  const textBody = [
    'New notary quote request from the website.',
    '',
    ...sheetRows(data, stamped).map(([label, value]) => `${label}: ${value}`),
    '',
    'A printable HTML copy is attached. Open the attachment and print or save as PDF.',
  ].join('\n');

  const payload = {
    from,
    to: [NOTARY_TO],
    reply_to: data.email,
    subject: `Notary quote request — ${data.name}`,
    html: sheetHtml,
    text: textBody,
    attachments: [
      {
        filename: `notary-quote-${data.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase() || 'request'}.html`,
        content: utf8ToBase64(sheetHtml),
      },
    ],
  };

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    let detail = '';
    try {
      const errBody = await res.json();
      detail = errBody?.message || JSON.stringify(errBody);
    } catch {
      detail = await res.text();
    }
    return {
      ok: false,
      status: 502,
      error: detail || 'Failed to send email to Andrée',
    };
  }

  return { ok: true, filledAt: stamped };
}
