# Admin Content Panel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let Andrée (owner) and Jean (dev) update prices, payment links, candle catalogue fields, and a few misc. site fields via `admin/`, persisted through a Cloudflare Worker into `content/site.json` on GitHub Pages.

**Architecture:** Public pages fetch `content/site.json` and fill DOM hooks. Admin UI posts to a Cloudflare Worker that checks `OWNER_PASSWORD` or `DEV_PASSWORD`, validates an allow-listed payload, and commits via the GitHub Contents API. Candle images upload to `assets/`.

**Tech Stack:** Static HTML/CSS/JS on GitHub Pages; `content/site.json`; Cloudflare Workers (Wrangler); GitHub Contents API; no npm build for the public site.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-08-04-admin-content-panel-design.md`
- Public site stays static on GitHub Pages (no build step for visitors)
- Secrets only in Cloudflare: `OWNER_PASSWORD`, `DEV_PASSWORD`, `SESSION_SECRET`, `GITHUB_TOKEN`, `GITHUB_REPO`, optional `GITHUB_BRANCH`
- Homepage keeps **no** payment buttons; pay blocks only on detail/store pages
- Editable fields are exactly the allow-list in the spec §4 — reject unknown keys
- Two roles (`owner` | `dev`) with **same** edit permissions; commit message tags the role
- CORS allow only `https://jeaneveillard.github.io` and `http://localhost` / `http://127.0.0.1`
- Payment/YouTube URLs when non-empty must be `https:`
- Images: jpeg/png/webp, max 2 MB
- Session: signed Bearer token, ~8h TTL, stored in `sessionStorage`

---

## File map

| Path | Responsibility |
|---|---|
| `content/site.json` | Editable content source of truth |
| `content.js` | Fetch JSON and apply to public pages |
| `admin/index.html` | Login + edit form UI |
| `admin/admin.css` | Admin-only styles |
| `admin/admin.js` | Login, load JSON, save, upload |
| `workers/admin-api/src/index.js` | Worker entry (CORS, routes) |
| `workers/admin-api/src/auth.js` | Password check + session sign/verify |
| `workers/admin-api/src/schema.js` | Allow-list validate/normalize |
| `workers/admin-api/src/github.js` | Contents API get/put |
| `workers/admin-api/wrangler.toml` | Worker name + config |
| `workers/admin-api/test/schema.test.js` | Node tests for schema |
| `workers/admin-api/test/auth.test.js` | Node tests for auth helpers |
| Public HTML pages | `data-content` / `data-pay` / `data-src` hooks |
| `README.md` | Owner + dev login; Jean’s Worker secret setup |

---

### Task 1: Seed `content/site.json` and schema module

**Files:**
- Create: `content/site.json`
- Create: `workers/admin-api/src/schema.js`
- Create: `workers/admin-api/test/schema.test.js`
- Create: `workers/admin-api/package.json` (test runner only inside Worker folder)

**Interfaces:**
- Produces: `validateSiteContent(input) → { ok: true, data } | { ok: false, error: string }`
- Produces: JSON shape used by every later task (exact keys below)

- [ ] **Step 1: Write failing schema tests**

```js
// workers/admin-api/test/schema.test.js
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
  const base = {/* minimal valid object with notary.stripe: 'http://evil' */};
  // build valid object then overwrite notary.stripe
});
```

(Complete the third test with a full valid object and only `notary.stripe` set to `http://evil.com/x`.)

- [ ] **Step 2: Run tests — expect FAIL (module missing)**

```bash
cd workers/admin-api && npm init -y && node --test test/schema.test.js
```

Expected: FAIL cannot find module / validateSiteContent

- [ ] **Step 3: Implement `schema.js` and seed JSON**

`content/site.json` exact shape (seed with current placeholder strings so the site looks unchanged until filled):

```json
{
  "notary": { "price": "[NOTARY PRICE]", "stripe": "", "paypal": "" },
  "cpr": { "price": "[CPR PRICE]", "stripe": "", "paypal": "" },
  "officiant": { "deposit": "[OFFICIANT DEPOSIT]", "stripe": "", "paypal": "" },
  "decoration": { "deposit": "[DECOR DEPOSIT]", "stripe": "", "paypal": "" },
  "candleLeadTime": "[CANDLE LEAD TIME]",
  "candles": [
    {
      "name": "[CANDLE 1 NAME]",
      "description": "[CANDLE 1 DESCRIPTION]",
      "price": "[CANDLE 1 PRICE]",
      "size": "[CANDLE 1 SIZE]",
      "image": "",
      "stripe": "",
      "paypal": ""
    },
    {
      "name": "[CANDLE 2 NAME]",
      "description": "[CANDLE 2 DESCRIPTION]",
      "price": "[CANDLE 2 PRICE]",
      "size": "[CANDLE 2 SIZE]",
      "image": "",
      "stripe": "",
      "paypal": ""
    },
    {
      "name": "[CANDLE 3 NAME]",
      "description": "[CANDLE 3 DESCRIPTION]",
      "price": "[CANDLE 3 PRICE]",
      "size": "[CANDLE 3 SIZE]",
      "image": "",
      "stripe": "",
      "paypal": ""
    }
  ],
  "misc": {
    "notaryExpiration": "[EXPIRATION DATE]",
    "hours": "[YOUR HOURS — e.g. Mon–Sat 8am–8pm]",
    "youtube": ""
  }
}
```

`validateSiteContent` must:
- Require exactly keys: `notary`, `cpr`, `officiant`, `decoration`, `candleLeadTime`, `candles`, `misc`
- `candles` length === 3
- String fields trimmed; empty string allowed for links/image
- If `stripe`/`paypal`/`youtube` non-empty → must start with `https://`
- `image` if non-empty → must match `^assets\/[A-Za-z0-9._-]+$`

- [ ] **Step 4: Re-run tests — expect PASS**

```bash
cd workers/admin-api && node --test test/schema.test.js
```

- [ ] **Step 5: Commit**

```bash
git add content/site.json workers/admin-api
git commit -m "Add site content schema and seed JSON for the admin panel"
```

---

### Task 2: Public `content.js` applicator

**Files:**
- Create: `content.js`
- Modify: `index.html`, `store.html`, `cpr.html`, `notary.html`, `officiant.html`, `decoration.html` (add `<script src="content.js" defer></script>` before or after `script.js`)

**Interfaces:**
- Consumes: `content/site.json` shape from Task 1
- Produces: DOM convention:
  - `data-content="notary.price"` → `textContent`
  - `data-pay="notary.stripe"` → set `href` if non-empty; if empty leave existing href or `href="#"` + `aria-disabled`
  - `data-src="candles.0.image"` → set `src` if non-empty
  - `data-content="candles.0.name"` etc.

- [ ] **Step 1: Write `content.js`**

```js
(function () {
  'use strict';
  function get(obj, path) {
    return path.split('.').reduce(function (o, k) {
      if (o == null) return undefined;
      if (/^\d+$/.test(k)) return o[Number(k)];
      return o[k];
    }, obj);
  }
  function apply(data) {
    document.querySelectorAll('[data-content]').forEach(function (el) {
      var v = get(data, el.getAttribute('data-content'));
      if (typeof v === 'string' && v !== '') el.textContent = v;
    });
    document.querySelectorAll('[data-pay]').forEach(function (el) {
      var v = get(data, el.getAttribute('data-pay'));
      if (typeof v === 'string' && v.indexOf('https://') === 0) {
        el.setAttribute('href', v);
        el.removeAttribute('aria-disabled');
      }
    });
    document.querySelectorAll('[data-src]').forEach(function (el) {
      var v = get(data, el.getAttribute('data-src'));
      if (typeof v === 'string' && v !== '') {
        el.setAttribute('src', v);
      }
    });
    document.querySelectorAll('[data-alt-name]').forEach(function (el) {
      var v = get(data, el.getAttribute('data-alt-name'));
      if (typeof v === 'string' && v !== '') {
        el.setAttribute('alt', v + ' candle');
      }
    });
  }
  fetch('content/site.json', { cache: 'no-store' })
    .then(function (r) { if (!r.ok) throw new Error('content'); return r.json(); })
    .then(apply)
    .catch(function () { /* keep HTML fallbacks */ });
})();
```

Path note: from `admin/` pages do not load this; from root HTML use `content/site.json`. Detail pages are at repo root so the relative path `content/site.json` is correct.

- [ ] **Step 2: Smoke-check locally**

Open `index.html` via a local static server (required — `file://` blocks fetch):

```bash
npx --yes serve -l 5500 .
```

In DevTools → Network: `site.json` 200; a `data-content` node shows seeded text.

- [ ] **Step 3: Commit**

```bash
git add content.js index.html store.html cpr.html notary.html officiant.html decoration.html
git commit -m "Load editable site content from JSON on public pages"
```

---

### Task 3: Wire DOM hooks on public pages

**Files:**
- Modify: `notary.html`, `cpr.html`, `officiant.html`, `decoration.html`, `store.html`, `index.html`

**Interfaces:**
- Consumes: data-* conventions from Task 2
- Must not reintroduce payment buttons on homepage service cards

- [ ] **Step 1: Detail/store pay blocks**

Example for `notary.html`:

```html
<p class="pay__price"><span class="ph" data-content="notary.price">[NOTARY PRICE]</span><small>per notarial act</small></p>
<div class="pay__row">
  <a class="btn btn--navy pay__btn" data-pay="notary.stripe" href="#">Pay by card</a>
  <a class="btn btn--gold pay__btn" data-pay="notary.paypal" href="#">Pay with PayPal</a>
</div>
```

Mirror for:
- `cpr.*` on `cpr.html`
- `officiant.deposit` + `officiant.stripe|paypal` on `officiant.html`
- `decoration.deposit` + `decoration.stripe|paypal` on `decoration.html`
- each candle on `store.html`: `candles.0.name`, `.description`, `.price`, `.size`, `candleLeadTime`, `data-src` / `data-alt-name`, `data-pay` for stripe/paypal

- [ ] **Step 2: Homepage preview + misc**

On `index.html` store preview only: name, description, lead time, image hooks — **no** `data-pay`.  
Credentials: `data-content="misc.notaryExpiration"`.  
Contact hours: `data-content="misc.hours"`.  
YouTube: `data-pay` is wrong — use `data-pay` only for pay buttons; for YouTube use `data-href` support **or** extend `content.js` with `data-href="misc.youtube"`. Prefer extending Task 2 applicator in this task:

```js
document.querySelectorAll('[data-href]').forEach(function (el) {
  var v = get(data, el.getAttribute('data-href'));
  if (typeof v === 'string' && v.indexOf('https://') === 0) el.setAttribute('href', v);
});
```

- [ ] **Step 3: Visual check**

Local serve: store + notary + index hours/expiration show JSON seed values. Homepage still has zero “Pay by card” buttons.

- [ ] **Step 4: Commit**

```bash
git add content.js index.html store.html cpr.html notary.html officiant.html decoration.html
git commit -m "Wire content hooks for prices, candles, and misc fields"
```

---

### Task 4: Auth helpers (owner + dev)

**Files:**
- Create: `workers/admin-api/src/auth.js`
- Create: `workers/admin-api/test/auth.test.js`

**Interfaces:**
- Consumes: `env.OWNER_PASSWORD`, `env.DEV_PASSWORD`, `env.SESSION_SECRET`
- Produces:
  - `resolveRole(password, env) → 'owner' | 'dev' | null`
  - `async signSession(role, env) → string` (token)
  - `async verifySession(token, env) → { role } | null`
- Token: HMAC-SHA256 over `role|exp` using Web Crypto; format `base64url(payload).base64url(sig)`; `exp` = now+8h

- [ ] **Step 1: Write auth tests** (use `node:test`; polyfill or run under a small harness that provides Web Crypto — Node 20+ has `globalThis.crypto`)

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveRole, signSession, verifySession } from '../src/auth.js';

const env = {
  OWNER_PASSWORD: 'owner-secret',
  DEV_PASSWORD: 'dev-secret',
  SESSION_SECRET: 'session-secret-at-least-16'
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
```

- [ ] **Step 2: Run — FAIL then implement `auth.js` — PASS**

- [ ] **Step 3: Commit**

```bash
git add workers/admin-api/src/auth.js workers/admin-api/test/auth.test.js
git commit -m "Add owner and dev session auth for the admin API"
```

---

### Task 5: GitHub Contents helper + Worker routes

**Files:**
- Create: `workers/admin-api/src/github.js`
- Create: `workers/admin-api/src/index.js`
- Create: `workers/admin-api/wrangler.toml`

**Interfaces:**
- Consumes: schema + auth from Tasks 1 & 4
- Produces HTTP API:
  - `OPTIONS *` → CORS
  - `POST /api/login` body `{ password }` → `{ token, role }` or 401
  - `POST /api/save` header `Authorization: Bearer <token>` body = site JSON → commit `content/site.json` message `Update site content (admin:<role>)`
  - `POST /api/upload` Bearer + JSON `{ name: "candle-1.jpg", contentBase64: "...", contentType: "image/jpeg" }` → write `assets/<safeName>` → `{ path: "assets/..." }`
- Rate limit: in-memory Map ip → { count, reset }; max 20 login attempts / 15 min / IP (best-effort on Workers)

`wrangler.toml`:

```toml
name = "bless-life-admin-api"
main = "src/index.js"
compatibility_date = "2026-08-01"
```

`github.js` functions:
- `getFile(env, path) → { sha, contentText }`
- `putFile(env, path, contentText, sha, message) → void`
- `putBinary(env, path, bytes, shaOrNull, message, contentType) → void` (base64 encode for API)

- [ ] **Step 1: Implement github + index** with CORS helper:

```js
const ALLOWED = new Set([
  'https://jeaneveillard.github.io',
  'http://localhost:5500',
  'http://127.0.0.1:5500'
]);
```

Reflect `Origin` only if in set.

- [ ] **Step 2: Manual Worker test**

```bash
cd workers/admin-api
npx wrangler dev
```

```bash
curl -s -X POST http://127.0.0.1:8787/api/login -H "content-type: application/json" -d "{\"password\":\"dev-secret\"}"
```

Expected with local secrets via `wrangler secret` / `.dev.vars`:
`.dev.vars` (gitignored):

```
OWNER_PASSWORD=owner-secret
DEV_PASSWORD=dev-secret
SESSION_SECRET=local-session-secret
GITHUB_TOKEN=
GITHUB_REPO=Jeaneveillard/bless-life-services
GITHUB_BRANCH=main
```

Login without token can be tested; save may skip if token empty — return 503 with clear message if `GITHUB_TOKEN` missing.

- [ ] **Step 3: Add `workers/admin-api/.gitignore`** with `.dev.vars` and `node_modules/`

- [ ] **Step 4: Commit**

```bash
git add workers/admin-api
git commit -m "Add Cloudflare Worker admin API for login, save, and upload"
```

---

### Task 6: Admin UI

**Files:**
- Create: `admin/index.html`
- Create: `admin/admin.css`
- Create: `admin/admin.js`

**Interfaces:**
- Consumes: Worker API base URL constant at top of `admin.js`:
  `var API_BASE = 'https://bless-life-admin-api.<account>.workers.dev';`  
  (Jean replaces after first deploy; also allow override `localStorage.API_BASE`)
- Consumes: same JSON shape as Task 1
- `sessionStorage.adminToken`, `sessionStorage.adminRole`

- [ ] **Step 1: Build login view + form view**

Sections: Notary, CPR, Officiant, Decoration, Candles (3 fieldsets), Misc.  
Each pay pair: text inputs for stripe/paypal.  
Candle: file input → on change POST `/api/upload` → set hidden image path field.  
Save → POST `/api/save` with full JSON built from form.  
Status region for success/error strings from the spec.

Password field + Login button; on 200 hide login, show form, GET `../content/site.json` to populate.

- [ ] **Step 2: Style with site fonts/colors** (Fraunces/Karla, navy/gold variables copied as needed into `admin.css` — do not break public `styles.css`).

- [ ] **Step 3: Local test against `wrangler dev`**

Login as dev → change notary price → Save (with real PAT) → confirm GitHub commit OR mock by checking network payload validates.

- [ ] **Step 4: Commit**

```bash
git add admin
git commit -m "Add admin UI for owner and dev content edits"
```

---

### Task 7: README + deploy notes

**Files:**
- Modify: `README.md` (new section **Admin panel**; update file tree; fix payment-link file table to `officiant.html` / `decoration.html` / `store.html` instead of outdated `index.html` for those links)
- Create: `workers/admin-api/README.md` (wrangler deploy, secrets list)

- [ ] **Step 1: Document for Andrée**

- URL: `https://jeaneveillard.github.io/bless-life-services/admin/`
- She uses the **owner** password only
- Edit → Save → wait 1–2 minutes → check live site

- [ ] **Step 2: Document for Jean (dev)**

```bash
cd workers/admin-api
npx wrangler login
npx wrangler secret put OWNER_PASSWORD
npx wrangler secret put DEV_PASSWORD
npx wrangler secret put SESSION_SECRET
npx wrangler secret put GITHUB_TOKEN
npx wrangler secret put GITHUB_REPO
# optional:
npx wrangler secret put GITHUB_BRANCH
npx wrangler deploy
```

Fine-grained PAT: Contents read/write on `Jeaneveillard/bless-life-services` only.  
Paste Worker URL into `admin/admin.js` `API_BASE`.

- [ ] **Step 3: Commit**

```bash
git add README.md workers/admin-api/README.md
git commit -m "Document owner and dev admin login and Worker deploy"
```

---

### Task 8: End-to-end verification checklist

**Files:** none new (checklist run only)

- [ ] **Step 1: Automated schema/auth tests**

```bash
cd workers/admin-api && node --test
```

Expected: all PASS

- [ ] **Step 2: Public regression**

- Homepage: no “Pay by card” / “Pay with PayPal”
- `store.html` / `cpr.html` / `notary.html` / `officiant.html` / `decoration.html`: pay buttons present and receive `href` from JSON when set
- Admin not in public nav

- [ ] **Step 3: Dual login**

- Owner password → role `owner` → save message `(admin:owner)`
- Dev password → role `dev` → save message `(admin:dev)`
- Wrong password → 401

- [ ] **Step 4: Final commit if any doc fixes**, then push when Jean asks

```bash
git status
```

---

## Spec coverage check

| Spec requirement | Task |
|---|---|
| `content/site.json` | 1 |
| Field allow-list §4 | 1, 3, 6 |
| Public fetch + fill | 2, 3 |
| No homepage pay buttons | 3, 8 |
| Admin UI | 6 |
| Worker login/save/upload | 5 |
| Owner + dev passwords | 4, 5, 7 |
| CORS + https URLs + image limits | 1, 5 |
| README / secrets | 7 |
| Rate limit login | 5 |
| Deferred CPR courses | out of plan (spec §10) |
