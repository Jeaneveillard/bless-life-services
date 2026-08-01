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
| `[FACEBOOK LINK]` | Your Facebook page URL | Contact section |
| `[INSTAGRAM LINK]` | Your Instagram profile URL | Contact section |
| `[TIKTOK LINK]` | Your TikTok profile URL | Contact section |
| `[YOUTUBE LINK]` | Your YouTube channel URL | Contact section |
| `[YOUR HOURS — …]` | e.g. `Mon–Sat 8:00 AM – 8:00 PM` | Contact section |
| `[ADD YOUR PRICING HERE]` | Your rates, or delete the whole FAQ item | FAQ section |
| `[CLIENT NAME]` ×3 | Real client names (with their permission) | Testimonials |
| `[CITY]` ×2 / `[ORGANIZATION]` | Their town, or the company you trained | Testimonials |

**A link must look like** `https://www.etsy.com/shop/YourShopName` — keep the
quotation marks around it in the HTML:

```html
<a href="https://www.etsy.com/shop/YourShopName" class="shop" ...>
```

> If a marketplace isn't live yet, delete that entire `<a class="shop">…</a>`
> block rather than leaving a dead link.

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

## 5. Hosting

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

## 6. Before going live — checklist

- [ ] All `[BRACKETED]` placeholders replaced or deleted
- [ ] All store links tested by clicking them
- [ ] Testimonials replaced with real ones, or section deleted
- [ ] Phone and email verified: **857-373-9518** / **etienneandree@yahoo.com**
- [ ] Notary commission expiration date is current
- [ ] Checked on a phone as well as a computer

---

## Notes on what is intentionally **not** on the site

Your AHA **Instructor ID** and **eCard Code** are deliberately excluded. Those
are verification identifiers meant for employers and the AHA's own
`heart.org/cpr/mycards` lookup — publishing them openly invites misuse. The
site shows the certification, the expiration, and the training center, which
is what builds trust with a customer.

The footer carries a standard disclaimer stating that a notary public is not
an attorney and cannot give legal advice. Keep it — it protects you.
