# Bless Life Services LLC — Website

**Live site:** https://jeaneveillard.github.io/bless-life-services/
**Source:** https://github.com/Jeaneveillard/bless-life-services

Static website. No build step, no dependencies, no server required.
Open `index.html` in any browser to preview locally.

```
Andree Lourdes/
├── index.html      ← all content
├── styles.css      ← all styling
├── script.js       ← menu, scroll reveal, FAQ, contact form
├── assets/
│   └── logo.png    ← brand logo (installed)
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

## 2. Replace the placeholders

Every item still needing your input is marked in the page with a
**gold highlighted box** like `[YOUR HOURS]`. Open `index.html` in
Notepad or VS Code, use **Ctrl+H** (Find and Replace), and swap each one.

Full list:

| Placeholder in the file | Replace with | Where |
|---|---|---|
| `[EXPIRATION DATE]` | Your MA notary commission expiration date | Credentials section |
| `[AMAZON STORE LINK]` | Full URL of your Amazon storefront | Store section |
| `[WALMART STORE LINK]` | Full URL of your Walmart seller page | Store section |
| `[ETSY SHOP LINK]` | Full URL of your Etsy shop | Store section |
| `[TIKTOK SHOP LINK]` | Full URL of your TikTok Shop | Store section |
| `[SHOPIFY STORE LINK]` | Full URL of your Shopify store | Store section |
| `[YOUTUBE LINK]` | Your YouTube channel URL, or delete the whole `<a>` | Contact section |
| `[YOUR HOURS — …]` | e.g. `Mon–Sat 8:00 AM – 8:00 PM` | Contact section |
| `[ADD YOUR PRICING HERE]` | Your rates, or delete the whole FAQ item | FAQ section |
| `[CLIENT NAME]` ×3 | Real client names (with their permission) | Testimonials |
| `[CITY]` ×2 / `[ORGANIZATION]` | Their town, or the company you trained | Testimonials |
| `[NOTARY PRICE]` | e.g. `$25` | Notary card + notary.html |
| `[CPR PRICE]` | e.g. `$85` | CPR card + cpr.html |
| `[OFFICIANT DEPOSIT]` / `[DECOR DEPOSIT]` | Deposit amount, e.g. `$150` | Services cards |
| `[STRIPE — …]` ×7 names, 9 spots | Stripe Payment Link URL | Services, candles, cpr.html, notary.html |
| `[PAYPAL — …]` ×7 names, 9 spots | PayPal button link URL | Services, candles, cpr.html, notary.html |
| `[CANDLE n NAME/DESCRIPTION/PRICE/SIZE/IMAGE]` | One set per candle model | Store section |
| `[CANDLE LEAD TIME]` | e.g. `5–7 days` | Store section |

**A link must look like** `https://www.etsy.com/shop/YourShopName` — keep the
quotation marks around it in the HTML:

```html
<a href="https://www.etsy.com/shop/YourShopName" class="shop" ...>
```

> If a marketplace isn't live yet, delete that entire `<a class="shop">…</a>`
> block rather than leaving a dead link.

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
> point line 509 of `index.html` at that one instead.

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

Nothing charges money until each `[STRIPE — …]` and `[PAYPAL — …]` placeholder is
replaced with a real link. Both providers are set up the same way: you create the
item in their dashboard, they hand you a URL, you paste it into `index.html`.

**Before you start, you need:**

- A **Stripe** account with your identity and bank account verified.
- A **PayPal Business** account. A Personal account cannot create payment buttons.
  Converting is free and done from PayPal's site — but only you can do it.

**Stripe — one link per item**

1. Dashboard → **Payment links** → **New**.
2. Name the item exactly as it appears on the site, set the price, create.
3. Under **After payment**, choose *Redirect to a page* and enter
   `https://jeaneveillard.github.io/bless-life-services/thank-you.html`
4. Copy the link. Paste it over the matching `[STRIPE — …]` in `index.html`.

**PayPal — one button per item**

1. Log in → **Pay & Get Paid** → **PayPal buttons** → **Buy Now**.
2. Set the item name and price. For candles, add shipping under checkout settings.
3. Set **Auto return** to the same `thank-you.html` address as above.
4. Copy the button link and paste it over the matching `[PAYPAL — …]`.

**Two of them appear twice.** `[STRIPE — NOTARY]` sits on the service card *and* on
`notary.html`; `[STRIPE — CPR SESSION]` sits on the card *and* on `cpr.html`. Same for
the PayPal pair. Create **one** link each and paste the same URL in both places — do
not make a second link, or your dashboard will show two products that are really one.

**Deposits.** For the officiant and decoration deposits, name the item so the client
cannot misread it — for example *"Wedding officiant — deposit to reserve your date"*.
The balance is sent afterwards as a Stripe or PayPal invoice.

**Candles are made to order on purpose.** Do not switch on stock tracking in either
dashboard. Two systems cannot share one stock count, and you would sell the same
candle twice. The lead time on the page is what protects you instead.

**Never label anything "BLS certification".** What you sell online is the in-person
skills session. The AHA card is issued after it, by the AHA.

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

## 7. Before going live — checklist

- [ ] All `[BRACKETED]` placeholders replaced or deleted
- [ ] All store links tested by clicking them
- [ ] Testimonials replaced with real ones, or section deleted
- [ ] Phone and email verified: **857-373-9518** / **etienneandree@yahoo.com**
- [ ] Notary commission expiration date is current
- [ ] Checked on a phone as well as a computer
- [ ] `bash tools/check-site.sh --production` passes
- [ ] One real payment made through Stripe and refunded
- [ ] One real payment made through PayPal and refunded
- [ ] Both return to the thank-you page after paying

---

## Notes on what is intentionally **not** on the site

Your AHA **Instructor ID** and **eCard Code** are deliberately excluded. Those
are verification identifiers meant for employers and the AHA's own
`heart.org/cpr/mycards` lookup — publishing them openly invites misuse. The
site shows the certification, the expiration, and the training center, which
is what builds trust with a customer.

The footer carries a standard disclaimer stating that a notary public is not
an attorney and cannot give legal advice. Keep it — it protects you.
