# Admin Content Panel for Andrée — Design

**Date:** 2026-08-04  
**Site:** Bless Life Services LLC — https://jeaneveillard.github.io/bless-life-services/  
**Status:** Approved for spec. Workstream B only (site content admin). Workstream C (CPR courses / student accounts) deferred.

---

## 1. Goal

Let Andrée update the site’s **payable and catalogue fields** herself — prices,
Stripe/PayPal links, candle copy and photos, and a short list of misc. site
fields — without editing HTML or asking a developer for each change.

---

## 2. Constraints that shaped the design

**The public site stays static on GitHub Pages.** No build step today; that
stays true for visitors. Content is data, not a new framework.

**Secrets cannot live in the repository or in browser JavaScript.** A GitHub
token that can write files must sit only in a server-side Worker secret.

**Andrée is non-technical.** The admin UI is a plain form with labelled fields
and one Save action. No markdown, no Git concepts exposed.

**Payments still happen on Stripe and PayPal.** The admin only stores the
*links* and the *display prices*. Account creation and link generation remain
in each provider’s dashboard (already documented in `README.md`).

---

## 3. Decisions

| Question | Decision | Why |
|---|---|---|
| Where does editable content live? | `content/site.json` | One file, easy to validate and commit |
| How do public pages use it? | Fetch JSON and fill marked DOM nodes | Keeps HTML structure; no rebuild |
| How does Andrée save? | `admin/` form → Cloudflare Worker → GitHub Contents API commit | Token never reaches the browser |
| Auth for v1 | Two passwords on the Worker: **owner** (Andrée) and **dev** (Jean) | Same edit rights; separate credentials so Jean can fix/update without sharing Andrée’s password |
| Candle photos | Upload through admin → written under `assets/` + path in JSON | Matches current asset layout |
| Scope vs CPR courses | Content admin only; courses deferred | User chose B before C |

---

## 4. Editable fields (v1)

Andrée can change **only** these. Everything else stays hard-coded in HTML.

| Area | Fields |
|---|---|
| Notary | Display price; Stripe link; PayPal link |
| CPR | Display price; Stripe link; PayPal link |
| Officiant | Deposit display amount; Stripe link; PayPal link |
| Decoration | Deposit display amount; Stripe link; PayPal link |
| Candles (×3) | Name; description; price; size; lead time; image; Stripe link; PayPal link |
| Misc | Notary commission expiration date; business hours text; YouTube URL |

**Out of scope for v1:** testimonials, long FAQ copy, logo, hero/marketing
prose, adding/removing services, refund policy text, social links other than
YouTube.

Candle lead time may be one shared value for all three models (as on the site
today) or per-candle if both homepage preview and `store.html` already treat
it the same way — implementation uses **one shared `candleLeadTime` string**
unless per-candle values already exist in markup; prefer shared to match
current placeholders.

---

## 5. Architecture

```
Public pages (GitHub Pages)
  └── fetch content/site.json → fill [data-content="…"] nodes / pay hrefs

Andrée
  └── admin/index.html (password + form)
        └── POST /api/save  (and /api/upload for images)
              └── Cloudflare Worker
                    ├── verify password (Worker secret)
                    ├── validate payload against allow-list schema
                    └── GitHub Contents API → commit content/site.json
                                              and/or assets/*.jpg
                          └── GitHub Pages republishes (~1–2 min)
```

### 5.1 Public pages

- Each field that comes from JSON has a stable hook, e.g.
  `data-content="notary.price"` or `data-pay="notary.stripe"`.
- On load, a small script (extend `script.js` or add `content.js`) applies
  values. Payment buttons get `href` from JSON; visible prices get text.
- If the fetch fails, keep existing HTML fallback text (placeholders or last
  committed markup). Do not invent fake live payment URLs.
- Homepage store preview shows candle name/description/lead time from JSON
  but **no** payment buttons (already the product rule). Full pay blocks live
  on `store.html`, `cpr.html`, `notary.html`, `officiant.html`,
  `decoration.html`.

### 5.2 Admin UI (`admin/index.html`)

1. Password gate: Worker `POST /api/login` returns a short-lived Bearer
   session token; admin stores it in `sessionStorage` and sends
   `Authorization: Bearer …` on save/upload.
2. Form sections mirroring the table in §4.
3. Candle photo: file input; Worker accepts image, writes to `assets/`,
   updates JSON path.
4. One primary **Save** control.
5. Success copy: *Saved. The live site updates in about 1–2 minutes.*  
   Failure copy: wrong password / network / validation — plain language.

Admin is **not** linked from the public nav. URL is shared privately with
Andrée. Obscurity is not security; the Worker password is.

### 5.3 Cloudflare Worker

- Routes e.g. `https://<worker>.workers.dev/api/*` or a custom route later.
- Secrets: `OWNER_PASSWORD`, `DEV_PASSWORD`, `SESSION_SECRET`,
  `GITHUB_TOKEN`, `GITHUB_REPO` (`Jeaneveillard/bless-life-services`),
  optional `GITHUB_BRANCH` (`main`).
- Endpoints:
  - `POST /api/login` — password → if it matches owner or dev, return a
    short-lived signed Bearer session that includes the role
    (`owner` | `dev`). Same permissions for both roles in v1.
  - `POST /api/save` — auth + JSON body → validate → commit `content/site.json`.
    Commit message includes the role, e.g. `Update site content (admin:dev)`.
  - `POST /api/upload` — auth + multipart/base64 image → commit under
    `assets/candle-N.ext` → return path for the form to put in JSON before
    or as part of save.
- Allow-list validation: reject unknown keys; require HTTPS URLs for payment
  and YouTube fields when non-empty; max image size (e.g. 2 MB); image types
  jpeg/png/webp only.
- Basic rate limit (e.g. per IP via Worker rate limiting or KV counter) on
  login and save.

### 5.4 GitHub commit

- Use Contents API: get file SHA, PUT updated content, message like
  `Update site content (admin)`.
- Commits appear as the token’s identity (fine for v1; document that in
  README for Jean/Andrée).

---

## 6. Files (expected)

| File | Role |
|---|---|
| `content/site.json` | Source of truth for editable fields |
| `admin/index.html` (+ minimal CSS, can reuse site tokens) | Owner UI |
| `admin/admin.js` | Form load/save/upload |
| `content.js` or `script.js` addition | Apply JSON on public pages |
| `workers/admin-api/` (or sibling folder) | Worker source + `wrangler.toml` |
| `index.html`, `store.html`, `cpr.html`, `notary.html`, `officiant.html`, `decoration.html` | Data hooks for JSON fields |
| `README.md` | How Andrée logs in; how Jean sets Worker secrets |

`styles.css` gains only what the admin page needs if the main stylesheet is
reused carefully; prefer a small `admin/admin.css` so public CSS stays clean.

---

## 7. Security

- Owner password, dev password, session secret, and GitHub token **only**
  in Cloudflare secrets.
- No passwords committed to the repo.
- Session: signed Bearer token (e.g. 8-hour TTL) in `sessionStorage`, sent
  only over HTTPS. Chosen because admin lives on GitHub Pages and the API on
  `*.workers.dev` (cross-origin; HttpOnly cookies are awkward without a
  custom domain). CORS allowlist: Pages origin only (+ localhost for dev).
- CORS: allow only
  `https://jeaneveillard.github.io` (and `http://localhost` for local
  admin testing if needed).
- Schema allow-list on every write.
- Rate-limit login.

This is **owner-grade** security for a single trusted user, not multi-tenant
hardening. Good enough for prices and payment *links* (links are public once
published anyway). Not sufficient for storing card data (we never do).

---

## 8. Operational steps for Jean (once)

1. Create Cloudflare account + Worker; set secrets.
2. Create a GitHub fine-grained PAT with Contents read/write on this repo only.
3. Deploy Worker; put public API base URL into `admin/admin.js` config
   (public base URL is fine; it is not a secret).
4. Set `OWNER_PASSWORD` (Andrée) and `DEV_PASSWORD` (Jean); give each person
   only their own password and the admin URL out of band.
5. Seed `content/site.json` from current placeholders so the first Save
   replaces known keys only.

Day-to-day (Andrée or Jean): open admin → login → edit → Save → wait for
Pages → verify live.

---

## 9. Testing

- Local: open public pages with a local `content/site.json`; confirm fill.
- Worker: login fail / login ok; save with bad token rejected; save updates
  repo on a branch or main as configured.
- Upload: reject oversized/non-image; accept jpeg and show on `store.html`
  after deploy.
- Mobile: admin form usable on phone.
- Regression: homepage still has **no** payment buttons; pay only on detail /
  store pages.

---

## 10. Deferred — workstream C

CPR course platform (students, enrolments, exams, Andrée marking) is **not**
designed here. When resumed, prefer reusing the same Cloudflare account and
auth patterns, but courses need real accounts and gated content — a separate
spec.

---

## 11. Success criteria

- Andrée can change a candle price and a Stripe link without opening HTML.
- After Save + Pages deploy, public pages show the new values.
- A stranger with only the admin URL cannot save without owner or dev password.
- Andrée can do routine catalogue/payment-link updates alone.
- Jean can log in with the **dev** password to correct or update the same fields
  without using Andrée’s password.
