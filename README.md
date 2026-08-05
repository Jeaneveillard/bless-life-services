# Bless Life Services LLC — Website

**Live site:** https://jeaneveillard.github.io/bless-life-services/
**Source:** https://github.com/Jeaneveillard/bless-life-services

Static website. No build step, no dependencies, no server required.
Open `index.html` in any browser to preview locally.

```
Andree Lourdes/
├── index.html          ← homepage — services overview, contact, FAQ
├── officiant.html      ← wedding officiant detail + deposit payment
├── decoration.html     ← event decoration detail + deposit payment
├── store.html          ← candle store + payment
├── cpr.html            ← CPR/BLS training detail page + payment
├── notary.html         ← notary service detail page + payment
├── thank-you.html      ← page shown after a successful payment
├── content/
│   └── site.json       ← prices, payment links, candle info (loaded by content.js)
├── content.js          ← fills public pages from site.json
├── admin/
│   ├── index.html      ← owner/dev content editor
│   ├── admin.js
│   └── admin.css
├── styles.css          ← all styling
├── script.js           ← menu, scroll reveal, FAQ, contact form
├── assets/
│   └── logo.png        ← brand logo (installed)
├── workers/
│   └── admin-api/      ← Cloudflare Worker — see workers/admin-api/README.md
├── tools/
│   └── check-site.sh   ← automated check — see "Before going live"
└── README.md
```

---

## 1. Sending corrections

The site is live and public. To request a change, open an issue:

**https://github.com/Jeaneveillard/bless-life-services/issues/new**

Write what should change and where — for example *"The hours should read
Monday to Saturday, 8am to 8pm"* or *"Replace the second testimonial."*
No technical knowledge needed; plain English is fine. Screenshots help.

Every change pushed to the `main` branch republishes the live site
automatically, usually within a minute.

---

## 2. Content you still edit in HTML

**Prices, Stripe/PayPal links, candles (copy + photos), hours, YouTube, and
notary commission expiration** are owned by the **admin panel** — use
[§7 Admin panel](#7-admin-panel), not Find/Replace in HTML.

What remains for HTML edits are mostly prose and one-off copy. Gold
highlighted boxes like `[CLIENT NAME]` still mark visible placeholders.
Open the file in Notepad or VS Code and use **Ctrl+H** (Find and Replace)
for these only:

| Placeholder in the file | Replace with | Where |
|---|---|---|
| `[ADD YOUR PRICING HERE]` | Extra FAQ pricing prose, or delete the whole FAQ item | FAQ section (`index.html`) |
| `[CLIENT NAME]` ×3 | Real client names (with their permission) | Testimonials |
| `[CITY]` ×2 / `[ORGANIZATION]` | Their town, or the company you trained | Testimonials |

Everything else that used to be a bracketed price, deposit, payment URL,
candle field, hours, YouTube, or expiration date is filled from
`content/site.json` via the admin panel.

### Social accounts already wired up

The Contact section links to these three. Shortened share links (`fb.me`,
`vm.tiktok.com`, `?igsh=…`) were resolved to their permanent addresses so the
links don't expire and don't carry tracking parameters.

| Network | Link in the site |
|---|---|
| Facebook | `https://www.facebook.com/people/Bless-Life-Services-LLC/100091315776379/` |
| Instagram | `https://www.instagram.com/blesslifeservices/` |
| TikTok | `https://www.tiktok.com/@blesslifeservicesbackup` |

> The TikTok handle ends in **`backup`**. If there is a main TikTok account,
> use Find and Replace (Ctrl+H) in `index.html` to search for
> `https://www.tiktok.com/@blesslifeservicesbackup` and replace it with the
> main account's URL instead.

---

## 3. Testimonials

The three quotes are **written examples, not real reviews.** Replace them with
genuine client feedback before the site goes live, or delete the whole
`<section class="section section--tint quotes">` block.

---

## 4. How the contact form works

By default the form opens the visitor's email app with the request pre-filled
and addressed to `etienneandree@yahoo.com`. This works everywhere with zero
setup, but the visitor must click "Send" in their own mail app.

**To receive submissions directly instead** (recommended once you're live):

1. Create a free account at [formspree.io](https://formspree.io) and get your form ID.
2. In `index.html`, change:
   ```html
   <form class="form reveal" style="--d:.15s" id="bookingForm" novalidate>
   ```
   to:
   ```html
   <form class="form reveal" style="--d:.15s" action="https://formspree.io/f/YOUR_ID" method="POST">
   ```
   (Removing `id="bookingForm"` disables the mailto script automatically.)

---

## 5. Turning on payments

Nothing charges money until each Stripe and PayPal link is a real
`https://…` URL in the **admin panel** ([§7](#7-admin-panel)). Create the
item in the provider dashboard, copy the URL they give you, then paste it
into the matching admin field and **Save**. Do not Find/Replace payment
URLs in the HTML files.

**Before you start, you need:**

- A **Stripe** account with your identity and bank account verified.
- A **PayPal Business** account. A Personal account cannot create payment buttons.
  Converting is free and done from PayPal's site — but only you can do it.
- The admin Worker deployed and `API_BASE` set (see §7) so Save works.

**Stripe — one link per item**

1. Dashboard → **Payment links** → **New**.
2. Name the item exactly as it appears on the site, set the price, create.
3. For the three candle links only, turn on **Shipping address collection**
   and add a shipping rate — candles are physically mailed, so Stripe needs
   an address and a delivery charge. Leave shipping **off** for the notary,
   CPR, and deposit links — nothing is shipped for those.
4. For the two deposit links only (officiant deposit and decor deposit), add
   a **required custom field** asking for the event date. Nothing in
   checkout otherwise asks which date is being held — without this field
   you receive a deposit for a date you were never told.
5. Under **After payment**, choose *Redirect to a page* and enter
   `https://jeaneveillard.github.io/bless-life-services/thank-you.html`
6. Copy the link. Paste it into the matching Stripe field in the **admin
   panel** (§7) for that service or candle, then Save.

**PayPal — one button per item**

1. Log in → **Pay & Get Paid** → **PayPal buttons** → **Buy Now**.
2. Set the item name and price. For candles, add shipping under checkout settings.
3. For the two deposit buttons only (officiant deposit and decor deposit),
   add a **required custom field** asking for the event date. Nothing in
   checkout otherwise asks which date is being held — without this field
   you receive a deposit for a date you were never told.
4. Set **Auto return** to the same `thank-you.html` address as above.
5. Copy the button link. Paste it into the matching PayPal field in the
   **admin panel** (§7), then Save.

**Which page each link powers.** Seven Stripe links and seven PayPal links
(admin fields map to these public pages):

| Link (admin field) | Public page |
|---|---|
| Notary | `notary.html` |
| CPR session | `cpr.html` |
| Officiant deposit | `officiant.html` |
| Decor deposit | `decoration.html` |
| Candle 1 / 2 / 3 | `store.html` |

**Deposits.** For the officiant and decoration deposits, name the item so the client
cannot misread it — for example *"Wedding officiant — deposit to reserve your date"*.
The balance is sent afterwards as a Stripe or PayPal invoice.

**Candles are made to order on purpose.** Do not switch on stock tracking in either
dashboard. Two systems cannot share one stock count, and you would sell the same
candle twice. The lead time on the page is what protects you instead.

**Never label anything "BLS certification".** What you sell online is the in-person
skills session. The AHA card is issued after it, by the AHA.

**Refunds and cancellations.** Both Stripe and PayPal look at your published
refund policy when they decide a dispute or a chargeback — if you haven't
stated one, the platform decides for you, and that usually favors the buyer.
Decide your own terms and publish them on the site before you go live,
especially for the made-to-order candles (which can't be "returned" once
poured) and the non-refundable booking deposits. This is a business decision
only you can make — write it in your own words.

**Sales tax on the candles.** Massachusetts taxes tangible personal property
at 6.25%. Candles are goods, so they are very likely taxable; notary,
officiant, decoration and CPR services are not goods and are treated
differently. Turn on tax collection for the three candle links only, and
confirm the correct treatment for every item with your accountant before
you rely on this — this is guidance, not tax advice.

**Before going live, run:**

```bash
bash tools/check-site.sh --production
```

It fails and names the file if any placeholder link is still in place.

---

## 6. Hosting

The site is already published on **GitHub Pages** at
https://jeaneveillard.github.io/bless-life-services/ — free, HTTPS, no
maintenance. Pushing to `main` redeploys it.

**To use a custom domain** (e.g. `blesslifeservices.com`):

1. Buy the domain (Namecheap, Google Domains, GoDaddy…).
2. At your registrar, add these DNS records:
   - four `A` records for `@` → `185.199.108.153`, `185.199.109.153`,
     `185.199.110.153`, `185.199.111.153`
   - one `CNAME` for `www` → `jeaneveillard.github.io`
3. In the repo: **Settings → Pages → Custom domain**, enter the domain, save,
   then tick **Enforce HTTPS** once the certificate is issued.

---

## 7. Admin panel

**Primary path** for prices, Stripe/PayPal links, candle copy and photos,
business hours, YouTube URL, and notary commission expiration. Use this
instead of editing HTML for those fields.

**URL:** https://jeaneveillard.github.io/bless-life-services/admin/

> **Blocked until Jean deploys the Worker.** The admin UI calls a Cloudflare
> Worker. `admin/admin.js` still has a placeholder `API_BASE`
> (`https://bless-life-admin-api.<account>.workers.dev`). That is **not** a
> real URL — do not invent one. After `npx wrangler deploy`, Jean must paste
> the **actual** Worker URL into `API_BASE` in `admin/admin.js` and push.
> Until then, login/save/upload will fail. For local testing only:
> `localStorage.setItem('API_BASE', 'http://127.0.0.1:8787')` then reload
> (serve admin from `http://localhost:5500` for CORS). Full deploy steps:
> `workers/admin-api/README.md`.

**For Andrée (owner):** Username `andreelourdes` (email
`etienneandree@yahoo.com`) and the **owner** password Jean gave you out of
band (not stored in this repo). Use **Show** next to a password field to
reveal it. If you forget it, open **Forgot password?** and use your email
plus the recovery key Jean shared. You can also change your password while
signed in (Change password section). Edit the fields → **Save** → wait 1–2
minutes for GitHub Pages to republish → check the live site.

**For Jean (dev):** Username `amboul` (email `jeaneveillard@gmail.com`) and
the **dev** password. Same workflow. Worker deploy and secrets setup
(including `RECOVERY_PASSWORD`): `workers/admin-api/README.md`.

Candle photo uploads always save as `assets/candle-1|2|3` plus
`.jpg` / `.jpeg` / `.png` / `.webp` (the original file name is ignored).

---

## 8. Before going live — checklist

- [ ] Admin Worker deployed; real URL pasted into `admin/admin.js` `API_BASE`
- [ ] Prices, payment links, candles, hours, YouTube set via admin and live
- [ ] Remaining HTML placeholders (testimonials / FAQ prose) replaced or deleted
- [ ] All payment links tested by clicking them
- [ ] Testimonials replaced with real ones, or section deleted
- [ ] Phone and email verified: **857-373-9518** / **etienneandree@yahoo.com**
- [ ] Notary commission expiration date is current (admin → misc)
- [ ] AHA instructor certification "Valid through" date (`index.html`,
      Credentials section) is still current — this is hard-coded and will
      go stale silently if not checked
- [ ] Checked on a phone as well as a computer
- [ ] `bash tools/check-site.sh --production` passes
- [ ] One real payment made through Stripe and refunded
- [ ] One real payment made through PayPal and refunded
- [ ] Both return to the thank-you page after paying

---

## 9. Notes on what is intentionally **not** on the site

Your AHA **Instructor ID** and **eCard Code** are deliberately excluded. Those
are verification identifiers meant for employers and the AHA's own
`heart.org/cpr/mycards` lookup — publishing them openly invites misuse. The
site shows the certification, the expiration, and the training center, which
is what builds trust with a customer.

The footer carries a standard disclaimer stating that a notary public is not
an attorney and cannot give legal advice. Keep it — it protects you.
