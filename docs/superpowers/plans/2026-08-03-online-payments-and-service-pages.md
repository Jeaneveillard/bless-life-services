# Online Payments & Service Pages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let clients pay on the site by card (Stripe) or PayPal, and give CPR and Notary their own pages in the navigation.

**Architecture:** Stripe and PayPal host their own catalogue and checkout. The site contains only plain `<a href>` links to provider-hosted pages — no SDK, no JavaScript, no secrets. A new `thank-you.html` is the return target both providers redirect to after payment.

**Tech Stack:** Hand-written HTML5, CSS3 and vanilla JS. No build step, no package manager, no framework, no dependencies. Bash (Git Bash on Windows) for the verification script.

## Global Constraints

- **No dependencies.** Do not add a package manager, framework, bundler or third-party script tag. The README promises "No build step, no dependencies, no server required" — that stays true.
- **No secrets in the repo.** Stripe Payment Link and PayPal button URLs are public by design; nothing else from either provider goes in a file.
- **Placeholders use the existing `[BRACKETED UPPERCASE]` convention** so they match the README's find-and-replace workflow.
- **Never write "BLS certification" or "certified" for anything the site sells online.** AHA certification requires an in-person skills session. Approved wording: "course completion", "training session", "skills session".
- **`script.js` is not modified** by any task in this plan.
- **Match the existing code style:** two-space indent in HTML, no semicolon-free CSS, `--d:` inline custom property for reveal stagger, `class="reveal"` on animated blocks.
- **Every new page reuses** `styles.css`, `script.js`, the header, the ribbon and the footer verbatim.

---

## File Structure

| File | Responsibility |
|---|---|
| `tools/check-site.sh` | **New.** Structural verification: no-JS fallback, internal links, unique ids, one `<h1>`, placeholder inventory. The red/green cycle for every task. |
| `styles.css` | Add `.pay` component and `.candle` grid. Existing rules untouched except the `.reveal` no-JS fix. |
| `index.html` | Payment block on 5 cards; store section rewritten as candle shop; nav gains two entries. |
| `thank-you.html` | **New.** Post-payment return page. No payment blocks — it is the exit, not an entry. |
| `cpr.html` | **New.** CPR & BLS detail page + payment block + AHA statement + course-material placeholder. |
| `notary.html` | **New.** Notary detail page + payment block + course-material placeholder. |
| `README.md` | Section 7: how Andrée creates a payment link and pastes it, with no developer involved. |

Pages are separate files rather than a template system because there is no build step. The duplication (header/footer on 4 pages) is the deliberate cost of that constraint.

---

## Task 1: Verification script and the no-JS fallback

`.reveal` sets `opacity:0` and only JavaScript adds `.is-in`. With JS disabled the entire page — including every payment button this plan adds — renders blank. `script.js` claims "Everything degrades gracefully without JS"; it does not. Fix this before adding anything that must be visible.

**Files:**
- Create: `tools/check-site.sh`
- Modify: `index.html` (add `<noscript>` in `<head>`, after the `styles.css` link on line 20)

**Interfaces:**
- Consumes: nothing.
- Produces: `bash tools/check-site.sh` exits 0 when the site is structurally sound, 1 otherwise. `bash tools/check-site.sh --production` additionally fails on any `[BRACKETED]` href. Every later task ends by running it.

- [ ] **Step 1: Write the failing check**

Create `tools/check-site.sh`:

```bash
#!/usr/bin/env bash
# Structural checks for the Bless Life Services static site.
# Usage: bash tools/check-site.sh [--production]
set -uo pipefail
cd "$(dirname "$0")/.." || exit 1

PRODUCTION=0
[ "${1:-}" = "--production" ] && PRODUCTION=1
fails=0
note() { printf '  %s\n' "$1"; }
fail() { printf 'FAIL  %s\n' "$1"; fails=$((fails + 1)); }
pass() { printf 'ok    %s\n' "$1"; }

pages=$(find . -maxdepth 1 -name '*.html' | sort)

# 1. No-JS fallback: any page using .reveal must keep content visible without JS.
for f in $pages; do
  if grep -q 'class="[^"]*reveal' "$f"; then
    if grep -q '<noscript>' "$f"; then
      pass "no-JS fallback present: $f"
    else
      fail "no-JS fallback missing: $f uses .reveal but has no <noscript>"
    fi
  fi
done

# 2. Exactly one <h1> per page.
for f in $pages; do
  n=$(grep -c '<h1' "$f")
  if [ "$n" -eq 1 ]; then pass "one <h1>: $f"; else fail "$f has $n <h1> (expected 1)"; fi
done

# 3. No duplicate id attributes within a page.
for f in $pages; do
  dupes=$(grep -o 'id="[^"]*"' "$f" | sort | uniq -d)
  if [ -z "$dupes" ]; then pass "unique ids: $f"; else fail "$f duplicate ids: $(echo "$dupes" | tr '\n' ' ')"; fi
done

# 4. Internal page links resolve to a file that exists.
for f in $pages; do
  for target in $(grep -o 'href="[a-z0-9._-]*\.html[^"]*"' "$f" | sed 's/href="//; s/#.*//; s/"//'); do
    if [ -f "$target" ]; then pass "link resolves: $f -> $target"
    else fail "$f links to missing file: $target"; fi
  done
done

# 5. Placeholder inventory.
total=0
for f in $pages README.md; do
  [ -f "$f" ] || continue
  n=$(grep -o '\[[A-Z][A-Z0-9 _—–-]*\]' "$f" | wc -l | tr -d ' ')
  total=$((total + n))
  [ "$n" -gt 0 ] && note "placeholders in $f: $n"
done
note "placeholders total: $total"

# 6. Production gate: no bracketed href may ship live.
if [ "$PRODUCTION" -eq 1 ]; then
  for f in $pages; do
    bad=$(grep -o 'href="\[[^"]*\]"' "$f")
    if [ -z "$bad" ]; then pass "no placeholder links: $f"
    else fail "$f still has placeholder links: $(echo "$bad" | tr '\n' ' ')"; fi
  done
fi

echo
if [ "$fails" -eq 0 ]; then echo "PASS — $total placeholder(s) remaining"; exit 0
else echo "FAILED — $fails problem(s)"; exit 1; fi
```

- [ ] **Step 2: Run it to confirm it fails**

```bash
bash tools/check-site.sh
```

Expected: `FAIL  no-JS fallback missing: ./index.html uses .reveal but has no <noscript>` and a final `FAILED — 1 problem(s)`.

- [ ] **Step 3: Add the `<noscript>` to `index.html`**

`.is-in` is only ever added by JavaScript, so the fix has to come from `<noscript>` —
a plain stylesheet rule cannot detect that JS is absent. In `<head>`, directly after
`<link rel="stylesheet" href="styles.css">` (line 20):

```html
<noscript><style>.reveal{opacity:1!important;transform:none!important}</style></noscript>
```

- [ ] **Step 4: Correct the claim in `script.js`'s header comment**

The file's opening comment reads "Everything degrades gracefully without JS", which
was untrue until Step 3. It is true now — leave the comment, and leave the rest of
`script.js` untouched.

- [ ] **Step 5: Run the check to verify it passes**

```bash
bash tools/check-site.sh
```

Expected: every line `ok`, final line `PASS — N placeholder(s) remaining`.

- [ ] **Step 6: Verify visually with JS disabled**

Open `index.html` in a browser with JavaScript disabled. Expected: all sections visible, no blank page. Re-enable JS: reveal animations still work.

- [ ] **Step 7: Commit**

```bash
git add tools/check-site.sh index.html
git commit -m "Keep the page readable when JavaScript is unavailable"
```

---

## Task 2: The `.pay` component and the thank-you page

**Files:**
- Modify: `styles.css` (append after the BUTTONS block, ~line 145)
- Create: `thank-you.html`

**Interfaces:**
- Consumes: `bash tools/check-site.sh` from Task 1; existing `.btn`, `.btn--gold`, `.btn--navy`, `.shell`, `.section` classes.
- Produces: markup contract every later task reuses verbatim —

```html
<div class="pay">
  <p class="pay__price">PRICE_TEXT</p>
  <div class="pay__row">
    <a class="btn btn--navy pay__btn" href="STRIPE_URL">Pay by card</a>
    <a class="btn btn--gold pay__btn" href="PAYPAL_URL">Pay with PayPal</a>
  </div>
  <p class="pay__note">NOTE_TEXT</p>
</div>
```

Also produces `thank-you.html` as the return URL for both providers.

- [ ] **Step 1: Add the `.pay` CSS**

Append to `styles.css` after `.btn--full`:

```css
/* ---------------------------------------------------------------
   PAY BLOCK — two providers side by side, client chooses
   --------------------------------------------------------------- */
.pay{margin-top:1.6rem;padding-top:1.5rem;border-top:1px solid var(--line)}
.pay__price{
  font-family:var(--display);font-size:1.6rem;font-weight:600;
  color:var(--blue-800);margin:0 0 1rem;line-height:1.2;
}
.pay__price small{
  display:block;font-family:var(--body);font-size:.82rem;font-weight:600;
  letter-spacing:.06em;text-transform:uppercase;color:var(--slate);margin-top:.3rem;
}
.pay__row{display:grid;grid-template-columns:1fr 1fr;gap:.7rem}
.pay__btn{padding:.9rem 1rem;font-size:.8rem;letter-spacing:.05em}
.pay__note{font-size:.85rem;color:var(--slate);margin:.9rem 0 0;line-height:1.5}

@media (max-width:560px){
  .pay__row{grid-template-columns:1fr}
}

.section--dark .pay{border-top-color:var(--line-light)}
.section--dark .pay__price{color:#fff}
.section--dark .pay__price small,
.section--dark .pay__note{color:rgba(255,255,255,.72)}
```

- [ ] **Step 2: Create `thank-you.html`**

Full file. The header nav uses `index.html#...` because this page is not the home page.

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Thank You — Bless Life Services LLC</title>
<meta name="description" content="Your payment to Bless Life Services LLC was received. Here is what happens next.">
<meta name="robots" content="noindex">

<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300..900;1,9..144,300..700&family=Karla:ital,wght@0,300..800;1,300..700&display=swap" rel="stylesheet">

<link rel="stylesheet" href="styles.css">
<noscript><style>.reveal{opacity:1!important;transform:none!important}</style></noscript>
</head>
<body>

<a class="skip-link" href="#main">Skip to content</a>

<header class="site-header" id="siteHeader">
  <div class="shell site-header__inner">
    <a href="index.html" class="brand" aria-label="Bless Life Services LLC home">
      <img class="brand__logo" src="assets/logo.png" alt="" width="800" height="646">
      <span class="brand__type">
        <strong>Bless Life</strong>
        <em>Services LLC</em>
      </span>
    </a>

    <nav class="nav" id="nav" aria-label="Primary">
      <a href="index.html#services">Services</a>
      <a href="cpr.html">CPR &amp; BLS</a>
      <a href="notary.html">Notary</a>
      <a href="index.html#store">Store</a>
      <a href="index.html#about">About</a>
      <a href="index.html#faq">FAQ</a>
      <a href="index.html#contact" class="nav__cta">Book Now</a>
    </nav>

    <button class="burger" id="burger" aria-label="Open menu" aria-expanded="false" aria-controls="nav">
      <span></span><span></span><span></span>
    </button>
  </div>
</header>

<main id="main">
<section class="section">
  <div class="shell">
    <div class="section__head reveal">
      <p class="eyebrow">Payment Received</p>
      <h1 class="section__title">Thank You</h1>
      <p class="section__lede">
        Your payment went through and a receipt is on its way to the email address
        you used at checkout. Keep it — it is your proof of purchase.
      </p>
    </div>

    <div class="reveal" style="--d:.1s">
      <h2>What happens next</h2>
      <ul class="card__list">
        <li>Andrée contacts you within one business day to confirm the details.</li>
        <li>For a booking deposit, the balance is invoiced once the quote is agreed.</li>
        <li>For a candle order, your candles are poured to order — the lead time
            shown at checkout starts today.</li>
        <li>For CPR &amp; BLS training, you will receive the date, address and
            what to bring to your in-person skills session.</li>
      </ul>

      <p>
        Nothing arrived, or something looks wrong? Call
        <a href="tel:+18573739518">857-373-9518</a> or email
        <a href="mailto:etienneandree@yahoo.com">etienneandree@yahoo.com</a>
        and mention the amount and the date you paid.
      </p>

      <a class="btn btn--navy" href="index.html">Back to the site</a>
    </div>
  </div>
</section>
</main>

<footer class="footer">
  <div class="shell footer__inner">
    <div class="footer__brand">
      <img class="footer__logo" src="assets/logo.png" alt="Bless Life Services LLC" width="800" height="646" loading="lazy">
      <p>Notary Public · Wedding Officiant · Event Decoration · Handcrafted Candles · CPR &amp; BLS Training</p>
    </div>

    <nav class="footer__nav" aria-label="Footer">
      <a href="index.html#services">Services</a>
      <a href="cpr.html">CPR &amp; BLS</a>
      <a href="notary.html">Notary</a>
      <a href="index.html#store">Store</a>
      <a href="index.html#about">About</a>
      <a href="index.html#contact">Contact</a>
    </nav>

    <div class="footer__legal">
      <p>&copy; <span id="year">2026</span> Bless Life Services LLC. All rights reserved. Massachusetts, USA.</p>
      <p class="footer__disclaimer">
        Bless Life Services LLC is not a law firm and does not provide legal advice. A notary
        public may not draft, select or explain legal documents. American Heart Association
        course completion cards are issued only after an in-person skills session.
      </p>
    </div>
  </div>
</footer>

<script src="script.js"></script>
</body>
</html>
```

- [ ] **Step 3: Run the check**

```bash
bash tools/check-site.sh
```

Expected: FAIL — `./thank-you.html links to missing file: cpr.html` and `notary.html` (they arrive in Task 5). This failure is expected and is resolved by Task 5; do not create stub files to silence it.

- [ ] **Step 4: Verify the page renders**

Open `thank-you.html` in a browser. Expected: header, ribbon-free page, thank-you copy, working footer, no unstyled flash.

- [ ] **Step 5: Commit**

```bash
git add styles.css thank-you.html
git commit -m "Add the post-payment return page and the two-provider pay block"
```

---

## Task 3: Payment blocks on the five service cards

**Files:**
- Modify: `index.html` — cards at lines 133-152 (Notary), 154-172 (Officiant), 174-192 (Decoration), 194-~215 (Candles), ~217-238 (CPR)

**Interfaces:**
- Consumes: the `.pay` markup contract from Task 2.
- Produces: ten placeholder hrefs, named `[STRIPE — <SERVICE>]` and `[PAYPAL — <SERVICE>]`, that Task 6 documents for Andrée.

Insert each block immediately **before** the closing `</article>` of its card, after the existing `<a class="card__link">`.

- [ ] **Step 1: Notary Public card**

```html
        <div class="pay">
          <p class="pay__price">[NOTARY PRICE]<small>per notarial act</small></p>
          <div class="pay__row">
            <a class="btn btn--navy pay__btn" href="[STRIPE — NOTARY]">Pay by card</a>
            <a class="btn btn--gold pay__btn" href="[PAYPAL — NOTARY]">Pay with PayPal</a>
          </div>
          <p class="pay__note">Travel is quoted separately for mobile appointments.</p>
        </div>
```

- [ ] **Step 2: Wedding Officiant card**

```html
        <div class="pay">
          <p class="pay__price">[OFFICIANT DEPOSIT]<small>deposit to reserve your date</small></p>
          <div class="pay__row">
            <a class="btn btn--navy pay__btn" href="[STRIPE — OFFICIANT DEPOSIT]">Pay by card</a>
            <a class="btn btn--gold pay__btn" href="[PAYPAL — OFFICIANT DEPOSIT]">Pay with PayPal</a>
          </div>
          <p class="pay__note">Holds your date. The balance is invoiced once the ceremony is planned.</p>
        </div>
```

- [ ] **Step 3: Event Decoration card**

```html
        <div class="pay">
          <p class="pay__price">[DECOR DEPOSIT]<small>deposit to reserve your date</small></p>
          <div class="pay__row">
            <a class="btn btn--navy pay__btn" href="[STRIPE — DECOR DEPOSIT]">Pay by card</a>
            <a class="btn btn--gold pay__btn" href="[PAYPAL — DECOR DEPOSIT]">Pay with PayPal</a>
          </div>
          <p class="pay__note">Holds your date. The balance is invoiced once the design is agreed.</p>
        </div>
```

- [ ] **Step 4: Handcrafted Candles card**

Link to the shop rather than a single price — the models live in the section Task 4 builds.

```html
        <div class="pay">
          <p class="pay__price">Made to order<small>poured after you order</small></p>
          <div class="pay__row">
            <a class="btn btn--navy pay__btn" href="#store">See the candles</a>
            <a class="btn btn--gold pay__btn" href="index.html#contact">Custom order</a>
          </div>
          <p class="pay__note">Wedding favors and bulk orders are quoted — tell us quantity and scent.</p>
        </div>
```

- [ ] **Step 5: CPR &amp; BLS Training card**

The wording must not imply certification is bought online.

```html
        <div class="pay">
          <p class="pay__price">[CPR PRICE]<small>per person — in-person skills session</small></p>
          <div class="pay__row">
            <a class="btn btn--navy pay__btn" href="[STRIPE — CPR SESSION]">Pay by card</a>
            <a class="btn btn--gold pay__btn" href="[PAYPAL — CPR SESSION]">Pay with PayPal</a>
          </div>
          <p class="pay__note">
            AHA course completion cards require this hands-on session.
            <a href="cpr.html">How certification works</a>
          </p>
        </div>
```

- [ ] **Step 6: Run the check**

```bash
bash tools/check-site.sh
```

Expected: `cpr.html` / `notary.html` still reported missing (Task 5). Placeholder total rises by 12. No new failure type.

- [ ] **Step 7: Verify layout on mobile**

Open `index.html`, narrow the window below 560px. Expected: the two buttons stack to one column, no horizontal scrollbar, price and note legible.

- [ ] **Step 8: Commit**

```bash
git add index.html
git commit -m "Offer card and PayPal payment on every service card"
```

---

## Task 4: Turn the store section into the candle shop

The five marketplace links are unreplaced placeholders pointing nowhere. Replace the section with made-to-order candles.

**Files:**
- Modify: `index.html` lines 273-313 (whole `<section class="section store">`)
- Modify: `styles.css` (append after the `.pay` block)

**Interfaces:**
- Consumes: `.pay` from Task 2.
- Produces: `#store` anchor preserved so the nav, footer and the Candles card from Task 3 keep working. Placeholders `[STRIPE — CANDLE N]`, `[PAYPAL — CANDLE N]`, `[CANDLE N NAME/PRICE/DESC]` for N in 1..3.

- [ ] **Step 1: Add the candle grid CSS**

```css
/* ---------------------------------------------------------------
   CANDLE SHOP — made to order, no stock counter
   --------------------------------------------------------------- */
.candles{display:grid;grid-template-columns:repeat(3,1fr);gap:1.5rem}
.candle{
  background:var(--paper);border:1px solid var(--line);border-radius:var(--r-lg);
  padding:1.6rem;display:flex;flex-direction:column;
}
.candle__img{
  width:100%;aspect-ratio:4/3;object-fit:cover;
  border-radius:var(--r);background:var(--sand);margin-bottom:1.2rem;
}
.candle__name{font-family:var(--display);font-size:1.35rem;color:var(--blue-800);margin:0 0 .5rem}
.candle__desc{color:var(--slate);font-size:.95rem;margin:0 0 .4rem;flex:1}
.candle__lead{
  font-size:.8rem;font-weight:700;letter-spacing:.06em;text-transform:uppercase;
  color:var(--gold-600);margin:0;
}
.candle .pay{margin-top:1.1rem}

@media (max-width:900px){ .candles{grid-template-columns:repeat(2,1fr)} }
@media (max-width:600px){ .candles{grid-template-columns:1fr} }
```

- [ ] **Step 2: Replace the whole store section**

Replace lines 273-313 of `index.html` with:

```html
<section class="section store" id="store">
  <div class="shell">
    <div class="section__head reveal">
      <p class="eyebrow">Shop Our Candles</p>
      <h2 class="section__title">Poured to Order</h2>
      <p class="section__lede">
        Small-batch candles hand-poured in Massachusetts. Nothing sits in a warehouse —
        yours is made after you order, which is why the scent is still sharp when it reaches you.
      </p>
    </div>

    <div class="candles">

      <article class="candle reveal" style="--d:.05s">
        <img class="candle__img" src="[CANDLE 1 IMAGE]" alt="[CANDLE 1 NAME] candle" width="600" height="450" loading="lazy">
        <h3 class="candle__name">[CANDLE 1 NAME]</h3>
        <p class="candle__desc">[CANDLE 1 DESCRIPTION]</p>
        <p class="candle__lead">Ready in [CANDLE LEAD TIME]</p>
        <div class="pay">
          <p class="pay__price">[CANDLE 1 PRICE]<small>[CANDLE 1 SIZE]</small></p>
          <div class="pay__row">
            <a class="btn btn--navy pay__btn" href="[STRIPE — CANDLE 1]">Pay by card</a>
            <a class="btn btn--gold pay__btn" href="[PAYPAL — CANDLE 1]">Pay with PayPal</a>
          </div>
        </div>
      </article>

      <article class="candle reveal" style="--d:.12s">
        <img class="candle__img" src="[CANDLE 2 IMAGE]" alt="[CANDLE 2 NAME] candle" width="600" height="450" loading="lazy">
        <h3 class="candle__name">[CANDLE 2 NAME]</h3>
        <p class="candle__desc">[CANDLE 2 DESCRIPTION]</p>
        <p class="candle__lead">Ready in [CANDLE LEAD TIME]</p>
        <div class="pay">
          <p class="pay__price">[CANDLE 2 PRICE]<small>[CANDLE 2 SIZE]</small></p>
          <div class="pay__row">
            <a class="btn btn--navy pay__btn" href="[STRIPE — CANDLE 2]">Pay by card</a>
            <a class="btn btn--gold pay__btn" href="[PAYPAL — CANDLE 2]">Pay with PayPal</a>
          </div>
        </div>
      </article>

      <article class="candle reveal" style="--d:.19s">
        <img class="candle__img" src="[CANDLE 3 IMAGE]" alt="[CANDLE 3 NAME] candle" width="600" height="450" loading="lazy">
        <h3 class="candle__name">[CANDLE 3 NAME]</h3>
        <p class="candle__desc">[CANDLE 3 DESCRIPTION]</p>
        <p class="candle__lead">Ready in [CANDLE LEAD TIME]</p>
        <div class="pay">
          <p class="pay__price">[CANDLE 3 PRICE]<small>[CANDLE 3 SIZE]</small></p>
          <div class="pay__row">
            <a class="btn btn--navy pay__btn" href="[STRIPE — CANDLE 3]">Pay by card</a>
            <a class="btn btn--gold pay__btn" href="[PAYPAL — CANDLE 3]">Pay with PayPal</a>
          </div>
        </div>
      </article>

    </div>

    <p class="section__lede reveal" style="--d:.26s">
      Wedding favors, corporate gifting or a scent that is not listed?
      <a href="#contact">Tell us what you want</a> — custom labels and bulk pricing are quoted directly.
    </p>
  </div>
</section>
```

- [ ] **Step 3: Run the check**

```bash
bash tools/check-site.sh
```

Expected: no new failure type; the five dead marketplace placeholders are gone from the inventory.

- [ ] **Step 4: Confirm the removed `.shop` CSS is now unused**

```bash
grep -n 'class="shop' *.html
```

Expected: no output. Leave the `.shop` rules in `styles.css` — Andrée may reopen marketplaces, and the spec records that intent.

- [ ] **Step 5: Commit**

```bash
git add index.html styles.css
git commit -m "Replace the dead marketplace links with a made-to-order candle shop"
```

---

## Task 5: CPR and Notary pages, and the navigation

**Files:**
- Create: `cpr.html`, `notary.html`
- Modify: `index.html` header nav (lines 66-72) and footer nav

**Interfaces:**
- Consumes: `.pay` from Task 2, the header/footer shell from `thank-you.html` in Task 2.
- Produces: `cpr.html` and `notary.html`, which resolve the missing-file failures reported since Task 2.

- [ ] **Step 1: Update the header nav in `index.html`**

Replace lines 66-72:

```html
    <nav class="nav" id="nav" aria-label="Primary">
      <a href="#services">Services</a>
      <a href="cpr.html">CPR &amp; BLS</a>
      <a href="notary.html">Notary</a>
      <a href="#store">Store</a>
      <a href="#about">About</a>
      <a href="#faq">FAQ</a>
      <a href="#contact" class="nav__cta">Book Now</a>
    </nav>
```

- [ ] **Step 2: Update the footer nav in `index.html`**

```html
    <nav class="footer__nav" aria-label="Footer">
      <a href="#services">Services</a>
      <a href="cpr.html">CPR &amp; BLS</a>
      <a href="notary.html">Notary</a>
      <a href="#store">Store</a>
      <a href="#about">About</a>
      <a href="#contact">Contact</a>
    </nav>
```

- [ ] **Step 3: Point the two service cards at their new pages**

In `index.html`, in the Notary card replace `<a href="#contact" class="card__link">Book a notary` with `<a href="notary.html" class="card__link">Notary services in detail`.

In the CPR card replace `<a href="#contact" class="card__link">` with `<a href="cpr.html" class="card__link">CPR training in detail`.

Leave the Officiant, Decoration and Candles cards pointing at `#contact`.

- [ ] **Step 4: Create `cpr.html`**

`thank-you.html` (created in Task 2) already carries the exact header, nav, footer and
`<noscript>` these pages need, with `index.html#...` links that are correct for a
non-home page. Start from a copy of it:

```bash
cp thank-you.html cpr.html && cp thank-you.html notary.html
```

Then in `cpr.html` make exactly four changes:

1. `<title>` becomes `CPR &amp; BLS Training — Bless Life Services LLC`
2. `<meta name="description" content="...">` becomes `American Heart Association CPR and BLS training in Massachusetts, taught by a certified AHA instructor. In-person skills sessions.`
3. Delete the line `<meta name="robots" content="noindex">` — this page must be indexed
4. Replace everything between `<main id="main">` and `</main>` with:

```html
<section class="section">
  <div class="shell">
    <div class="section__head reveal">
      <p class="eyebrow">American Heart Association</p>
      <h1 class="section__title">CPR &amp; BLS Training</h1>
      <p class="section__lede">
        Taught by a certified AHA BLS Instructor in Massachusetts. Individuals,
        workplace groups, and healthcare staff renewing a card.
      </p>
    </div>

    <div class="reveal" style="--d:.1s">
      <h2>How AHA certification actually works</h2>
      <p>
        An AHA course completion card is never issued for online study alone.
        Certification has two parts, and the second one cannot be skipped:
      </p>
      <ul class="card__list">
        <li><strong>The coursework</strong> — either in a classroom, or online through
            AHA's own HeartCode program, which you buy from the AHA.</li>
        <li><strong>The hands-on skills session</strong> — in person, with an AHA
            instructor. This is what Andrée provides, and this is what issues your card.</li>
      </ul>
      <p>
        Anyone selling you a card for an online quiz alone is not selling you an AHA
        certification. If your employer requires AHA, the skills session is mandatory.
      </p>

      <h2>What you can book here</h2>
      <div class="pay">
        <p class="pay__price">[CPR PRICE]<small>per person — in-person skills session</small></p>
        <div class="pay__row">
          <a class="btn btn--navy pay__btn" href="[STRIPE — CPR SESSION]">Pay by card</a>
          <a class="btn btn--gold pay__btn" href="[PAYPAL — CPR SESSION]">Pay with PayPal</a>
        </div>
        <p class="pay__note">
          Group and workplace rates are quoted —
          <a href="index.html#contact">tell us how many people</a>.
        </p>
      </div>

      <!-- COURSE MATERIAL GOES HERE.
           Study guides and practice quizzes only. Practice quizzes carry no
           certification value and must be labelled as practice.
           Paid, account-gated courses cannot run on GitHub Pages — see
           docs/superpowers/specs/2026-08-03-online-payments-and-service-pages-design.md
           section 10 before building anything here. -->
    </div>
  </div>
</section>
```

- [ ] **Step 5: Create `notary.html`**

`notary.html` was copied from `thank-you.html` in Step 4. Make the same four changes:
`<title>` becomes `Notary Public — Bless Life Services LLC`; description becomes
`Commissioned Massachusetts Notary Public. Acknowledgments, jurats, oaths and mobile notary service across the Commonwealth.`;
delete the `noindex` meta; and replace the `<main id="main">` contents with:

```html
<section class="section">
  <div class="shell">
    <div class="section__head reveal">
      <p class="eyebrow">Commonwealth of Massachusetts</p>
      <h1 class="section__title">Notary Public</h1>
      <p class="section__lede">
        Commissioned in Massachusetts. Acknowledgments, jurats, signature witnessing,
        oaths and affirmations — at our location or yours.
      </p>
    </div>

    <div class="reveal" style="--d:.1s">
      <h2>What we can and cannot do</h2>
      <p>
        A notary verifies who signed a document. A notary is not an attorney and may
        not draft your document, choose which form you need, or explain what it means.
        If you need that, you need a lawyer — and we will say so rather than guess.
      </p>

      <h2>What to bring</h2>
      <ul class="card__list">
        <li>Government-issued photo ID that is current and not expired.</li>
        <li>The complete document — every page, nothing filled in afterwards.</li>
        <li>An unsigned signature line. You sign in front of the notary, not before.</li>
        <li>Any additional signers, present at the same appointment.</li>
      </ul>

      <h2>Book a notarization</h2>
      <div class="pay">
        <p class="pay__price">[NOTARY PRICE]<small>per notarial act</small></p>
        <div class="pay__row">
          <a class="btn btn--navy pay__btn" href="[STRIPE — NOTARY]">Pay by card</a>
          <a class="btn btn--gold pay__btn" href="[PAYPAL — NOTARY]">Pay with PayPal</a>
        </div>
        <p class="pay__note">
          Massachusetts sets no maximum notary fee; the price above is what you pay,
          disclosed before the act. Mobile appointments add a travel charge quoted in advance —
          <a href="index.html#contact">ask for a quote</a>.
        </p>
      </div>

      <!-- COURSE MATERIAL GOES HERE.
           Notary training carries no AHA-style restriction. Paid, account-gated
           courses still cannot run on GitHub Pages — see
           docs/superpowers/specs/2026-08-03-online-payments-and-service-pages-design.md
           section 10 before building anything here. -->
    </div>
  </div>
</section>
```

- [ ] **Step 6: Copy the service-specific FAQ entries onto each page**

The spec calls for service-specific FAQ on the new pages. Open the FAQ section of
`index.html` (lines 388-475) and read the existing questions. Copy — do not move —
each question that concerns only notarization into `notary.html`, and each that
concerns only CPR/BLS into `cpr.html`, inserting them before the
`<!-- COURSE MATERIAL GOES HERE -->` comment using the existing FAQ markup:

```html
      <h2>Common questions</h2>
      <div class="faq__list">
        <!-- paste the matching <div class="faq__item"> blocks from index.html here -->
      </div>
```

Copying rather than moving keeps the home-page FAQ complete for visitors who never
open a service page. If no existing question is service-specific, omit the heading
rather than inventing questions — Andrée supplies real ones later.

Check the FAQ markup first so the paste matches:

```bash
sed -n '388,475p' index.html
```

- [ ] **Step 7: Run the check — this is the one that must go fully green**

```bash
bash tools/check-site.sh
```

Expected: every line `ok`, including `link resolves` for `cpr.html` and `notary.html` from all four pages. Final line `PASS — N placeholder(s) remaining`.

- [ ] **Step 8: Click every nav link in a browser**

Open `index.html`. Click CPR & BLS, Notary, then the logo, then the footer links on each page. Expected: no 404, header identical on all four pages, mobile burger menu opens on the new pages.

- [ ] **Step 9: Commit**

```bash
git add index.html cpr.html notary.html
git commit -m "Give CPR and Notary their own pages and menu entries"
```

---

## Task 6: Document the wiring for Andrée

The site is structurally finished but nothing charges yet. This task makes the remaining work doable without a developer.

**Files:**
- Modify: `README.md` (placeholder table in section 2; new section 7 before "Hosting"; checklist in section 6)

**Interfaces:**
- Consumes: every placeholder name created in Tasks 3, 4 and 5.
- Produces: nothing code depends on.

- [ ] **Step 1: Add the payment placeholders to the table in section 2**

```markdown
| `[NOTARY PRICE]` | e.g. `$25` | Notary card + notary.html |
| `[CPR PRICE]` | e.g. `$85` | CPR card + cpr.html |
| `[OFFICIANT DEPOSIT]` / `[DECOR DEPOSIT]` | Deposit amount, e.g. `$150` | Services cards |
| `[STRIPE — …]` ×7 names, 9 spots | Stripe Payment Link URL | Services, candles, cpr.html, notary.html |
| `[PAYPAL — …]` ×7 names, 9 spots | PayPal button link URL | Services, candles, cpr.html, notary.html |
| `[CANDLE n NAME/DESC/PRICE/SIZE/IMAGE]` | One set per candle model | Store section |
| `[CANDLE LEAD TIME]` | e.g. `5–7 days` | Store section |
```

- [ ] **Step 2: Add section 7 to `README.md`, before "Hosting"**

```markdown
## 7. Turning on payments

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
```

- [ ] **Step 3: Extend the checklist in section 6**

```markdown
- [ ] `bash tools/check-site.sh --production` passes
- [ ] One real payment made through Stripe and refunded
- [ ] One real payment made through PayPal and refunded
- [ ] Both return to the thank-you page after paying
```

- [ ] **Step 4: Verify the production gate actually fires**

```bash
bash tools/check-site.sh --production
```

Expected: exits 1, listing every `[STRIPE — …]` and `[PAYPAL — …]` href still present. This is correct — it is the gate doing its job.

- [ ] **Step 5: Commit**

```bash
git add README.md
git commit -m "Document how to turn on Stripe and PayPal without a developer"
```

---

## Definition of done

- `bash tools/check-site.sh` exits 0
- `bash tools/check-site.sh --production` exits 1, naming only payment placeholders awaiting Andrée's accounts
- All four pages render with JavaScript disabled
- No page says "certification" for anything sold online
- Nothing is pushed to `main` until Jean approves — pushing republishes the live site
