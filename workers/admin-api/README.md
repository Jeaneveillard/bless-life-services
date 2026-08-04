# bless-life-admin-api

Cloudflare Worker backing the admin panel at `/admin/`. Handles login,
validates content payloads, commits `content/site.json` and candle images
via the GitHub Contents API.

## Deploy (Jean)

```bash
cd workers/admin-api
npx wrangler login
npx wrangler secret put OWNER_PASSWORD   # Andrée's login — give her only this one
npx wrangler secret put DEV_PASSWORD     # Jean's login — for dev/testing
npx wrangler secret put SESSION_SECRET   # random string for signed session tokens
npx wrangler secret put GITHUB_TOKEN     # fine-grained PAT — see below
npx wrangler secret put GITHUB_REPO      # Jeaneveillard/bless-life-services
# optional:
npx wrangler secret put GITHUB_BRANCH    # defaults to main if unset
npx wrangler deploy
```

After deploy, copy the Worker URL (e.g.
`https://bless-life-admin-api.<account>.workers.dev`) and paste it into
`admin/admin.js` as `API_BASE`. For local testing against `wrangler dev`:

```js
localStorage.setItem('API_BASE', 'http://127.0.0.1:8787');
```

## GitHub token

Create a **fine-grained** personal access token with **Contents read/write**
on `Jeaneveillard/bless-life-services` only. Store it as `GITHUB_TOKEN`.

## Secrets reference

| Secret | Purpose |
|---|---|
| `OWNER_PASSWORD` | Andrée's admin login |
| `DEV_PASSWORD` | Jean's admin login |
| `SESSION_SECRET` | HMAC key for session tokens |
| `GITHUB_TOKEN` | PAT for committing site.json and uploads |
| `GITHUB_REPO` | `owner/repo` to update |
| `GITHUB_BRANCH` | Optional; defaults to `main` |

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
| `/api/login` | POST | `{ password }` → `{ token, role }` |
| `/api/save` | POST | Bearer + site JSON → commit `content/site.json` |
| `/api/upload` | POST | Bearer + image → commit under `assets/` |

CORS allowlist: `https://jeaneveillard.github.io`, `http://localhost:5500`,
`http://127.0.0.1:5500`.
