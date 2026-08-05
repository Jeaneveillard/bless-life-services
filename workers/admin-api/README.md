# bless-life-admin-api

Cloudflare Worker backing the admin panel at `/admin/`. Handles login,
validates content payloads, commits `content/site.json` and candle images
via the GitHub Contents API.

## Deploy (Jean)

```bash
cd workers/admin-api
npx wrangler login
npx wrangler secret put OWNER_PASSWORD   # Andrée — username andreelourdes
npx wrangler secret put DEV_PASSWORD     # Jean — username amboul
npx wrangler secret put RECOVERY_PASSWORD  # shared key for "Forgot password"
npx wrangler secret put SESSION_SECRET   # random string for signed session tokens
npx wrangler secret put GITHUB_TOKEN     # fine-grained PAT — see below
npx wrangler secret put GITHUB_REPO      # Jeaneveillard/bless-life-services
npx wrangler secret put RESEND_API_KEY   # for notary quote emails to Andrée only
# optional:
npx wrangler secret put RESEND_FROM      # e.g. "Bless Life <hello@yourdomain.com>"
npx wrangler secret put GITHUB_BRANCH    # defaults to main if unset
# optional but recommended for durable password changes across Worker isolates:
# npx wrangler kv namespace create PASSWORD_OVERRIDES
# then add the id under [[kv_namespaces]] in wrangler.toml (binding PASSWORD_OVERRIDES)
npx wrangler deploy
```

### Notary quote emails (Andrée only)

Public form on `notary.html` posts to `/api/notary-quote`. The Worker emails
**only** `etienneandree@yahoo.com` with:

1. The branded printable sheet in the **HTML email body**
2. The same sheet as an **HTML attachment** (open → Print / Save as PDF)

Create a free [Resend](https://resend.com) account, add `RESEND_API_KEY`, and set
`RESEND_FROM` to a verified sender. Until a domain is verified, Resend may only
deliver to the Resend account owner — verify a domain (or use their test sender
rules) before relying on delivery to Andrée’s Yahoo address.

**Required after deploy:** copy the **real** Worker URL wrangler prints
(something like `https://bless-life-admin-api.<your-account-id>.workers.dev`)
and paste it into `admin/admin.js` as `API_BASE`. The checked-in value is a
placeholder only — the admin panel cannot login/save/upload until this is
done. Do not invent a production URL.

For local testing against `wrangler dev`:

```js
localStorage.setItem('API_BASE', 'http://127.0.0.1:8787');
```

## Rate limits

Login, save, upload, and notary-quote each allow **20 requests per IP per 15 minutes**.
Counters are **in-memory and isolate-local** (each Cloudflare isolate has its
own Map). That is enough for v1 abuse resistance; it is not a global quota
across all regions or Worker instances.

## GitHub token

Create a **fine-grained** personal access token with **Contents read/write**
on `Jeaneveillard/bless-life-services` only. Store it as `GITHUB_TOKEN`.

## Secrets reference

| Secret | Purpose |
|---|---|
| `OWNER_PASSWORD` | Password for username `andreelourdes` (Andrée, `etienneandree@yahoo.com`) |
| `DEV_PASSWORD` | Password for username `amboul` (Jean, `jeaneveillard@gmail.com`) |
| `RECOVERY_PASSWORD` | Shared recovery key for Forgot password (give Andrée out of band) |
| `SESSION_SECRET` | HMAC key for session tokens |
| `GITHUB_TOKEN` | PAT for committing site.json and uploads |
| `GITHUB_REPO` | `owner/repo` to update |
| `GITHUB_BRANCH` | Optional; defaults to `main` |
| `RESEND_API_KEY` | Sends notary quote emails (body + printable attachment) to Andrée only |
| `RESEND_FROM` | Optional verified From address for Resend |

Passwords live only in Cloudflare — never commit them to the repo.
Local dev uses `workers/admin-api/.dev.vars` (gitignored).

## Local dev

```bash
cd workers/admin-api
npx wrangler dev
```

Copy values into `.dev.vars` (gitignored; see task notes or create from the
secrets table above).
Leave `GITHUB_TOKEN` empty to test login/schema without live commits (save
returns 503).

## API routes

| Route | Method | Description |
|---|---|---|
| `/api/login` | POST | `{ username, password }` → `{ token, role, username, email }` |
| `/api/change-password` | POST | Bearer + `{ oldPassword, newPassword }` |
| `/api/reset-password` | POST | `{ username, email, recoveryPassword, newPassword }` |
| `/api/notary-quote` | POST | Public. Quote form → email Andrée only (HTML body + HTML attachment) |
| `/api/save` | POST | Bearer + site JSON → commit `content/site.json` |
| `/api/upload` | POST | Bearer + image → commit `assets/candle-{1,2,3}.{jpg,jpeg,png,webp}` only |

CORS allowlist: `https://jeaneveillard.github.io`, `http://localhost:5500`,
`http://127.0.0.1:5500`.

Uploads reject any basename other than `candle-1`, `candle-2`, or `candle-3`
with an allowed image extension. The admin UI always sends that name for the
selected candle slot (browser file names are ignored).
