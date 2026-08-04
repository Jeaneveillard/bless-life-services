# Online Payments & Dedicated Service Pages — Design

**Date:** 2026-08-03
**Site:** Bless Life Services LLC — https://jeaneveillard.github.io/bless-life-services/
**Status:** Approved for spec. Workstreams 1 and 2 only; workstream 3 deferred.

---

## 1. Goal

Let clients pay Bless Life Services directly on the website, choosing between
Stripe and PayPal, and give CPR and Notary their own pages in the navigation.

---

## 2. Constraints that shaped the design

**The site is static.** GitHub Pages, no build step, no server, no dependencies.
No secret key can live in the repository, so any payment integration must be
hosted entirely by the payment provider.

**PayPal cannot run through Stripe here.** Stripe's PayPal payment method is
restricted to 28 European countries. Bless Life Services is a Massachusetts
business. Stripe's US alternative — the PayPal custom payment method — is in
preview, requires hosting a Stripe-provided adapter (a server), and charges
Stripe's fees *on top of* PayPal's. Rejected.

Stripe and PayPal are therefore **two independent systems**. This was an
explicit product decision, not a workaround: the client picks how to pay.

**Massachusetts sets no statutory cap on notary fees.** The state is one of a
small number with no maximum for ordinary notarial acts. The only obligation is
to disclose the fee to the signer before performing the act — which a published
price satisfies well.

---

## 3. Decisions

| Question | Decision | Why |
|---|---|---|
| Stripe or PayPal | **Both, side by side** | Client chooses at checkout |
| Candle inventory | **Made to order, no stock counter** | Two systems cannot share a stock count; made-to-order removes the problem instead of managing it |
| Variable-price services | **Deposit online, balance invoiced** | A fixed price on event decoration would be false and invites disputes |
| Integration style | **Plain links, no embedded SDK** | Keeps the "no dependencies" promise, no third-party scripts on every visit, works with scripts blocked |
| Paid courses | **Deferred** | Requires accounts and a server; out of scope here |

---

## 4. Architecture

Stripe and PayPal each host the catalogue and the checkout page. The website
contains only links.

```
Site (GitHub Pages, static)
├── Service card ──► Stripe Payment Link  ──► Stripe-hosted checkout ──┐
│                └─► PayPal hosted button ──► PayPal-hosted checkout ──┤
└── thank-you.html ◄──────────── return URL ◄─────────────────────────┘
```

Consequences:

- Andrée changes a price in her dashboard; the site follows with no code change
- No secrets in the repo — Payment Link URLs are public by design
- No JavaScript added; `script.js` is untouched
- `thank-you.html` is required, not cosmetic: without a return URL the customer
  is stranded on PayPal after paying

---

## 5. What the client sees

Each service card gains a price line and a two-button block: **Pay by card**
(Stripe) and **Pay with PayPal**.

| Service | Charged online |
|---|---|
| Notary Public | Full price, per act |
| CPR & BLS Training | Full price, per person — **the in-person skills session** |
| Wedding Officiant | Deposit — "Reserve your date". Balance invoiced after quote |
| Event Decoration | Deposit — "Reserve your date". Balance invoiced after quote |
| Candles | Full price per model, made to order |

### Store section becomes the candle shop

"Find Us Online" currently lists Amazon, Walmart, Etsy, TikTok Shop and Shopify.
All five are unreplaced placeholders — five dead links on a public site. No
marketplace exists yet.

It is rewritten as **Shop Our Candles**: one block per model with photo, price,
lead time, and the two payment buttons. Marketplace links can return later if
Andrée opens those stores.

### Navigation

`Services · CPR & BLS · Notary · Store · About · FAQ · Book Now`

`cpr.html` and `notary.html` are real pages, not anchors — they are where course
material will live once workstream 3 is unblocked.

Each page reuses the existing header, footer and stylesheet, and contains:

- What the service covers, expanded beyond the summary on the card
- Andrée's relevant credentials (AHA instructor / MA commission), as already
  worded in the Credentials section — not repeated verbatim, linked in substance
- The price and the same two payment buttons as the card
- Service-specific FAQ entries, moved or duplicated from the main FAQ
- On `cpr.html`: a plain statement that AHA certification requires the in-person
  skills session, so no visitor can mistake what they are buying
- An empty, commented placeholder block marking where course material will go

The Services cards for CPR and Notary point to their new page instead of
`#contact`. The other three cards keep their current `#contact` link. No content
is deleted from `index.html` — the pages expand on the cards, they do not
replace them.

---

## 6. Files

| File | Change |
|---|---|
| `index.html` | Price line + payment block on 5 cards; store section rewritten; nav updated |
| `cpr.html` | **New.** CPR & BLS detail page |
| `notary.html` | **New.** Notary detail page |
| `thank-you.html` | **New.** Post-payment return page |
| `styles.css` | New `.pay` component reusing existing `.btn` variables |
| `README.md` | Procedure for Andrée to create and paste a payment link herself |
| `script.js` | Untouched |

---

## 7. Inputs required from Andrée — critical path

Nothing can be wired until these arrive:

1. **PayPal Business account.** Hosted buy buttons require Business; a Personal
   account cannot create them. Conversion is free and done online — by her.
2. **Stripe account** created, identity and bank account verified.
3. **Prices:** notary per act, CPR per person, the two deposit amounts, and each
   candle model with price and photo.
4. **Candle fulfilment:** shipping or local pickup, shipping cost, and the lead
   time to advertise.

The code will ship with clearly marked placeholder links, matching the existing
`[BRACKETED]` convention, so each can be swapped without touching structure.

### Out of scope for the developer

Creating the accounts and entering banking or identity details is Andrée's to
do, directly with Stripe and PayPal.

---

## 8. Operational cost to accept

Two providers means **two dashboards, two payouts, two sets of records** to
reconcile at year end. This is the accepted price of letting the client choose.

Fee difference by route:

| | Stripe | PayPal |
|---|---|---|
| Card | 2.9% + $0.30 | 2.99% + $0.49 |
| PayPal balance / Venmo | — | 3.49% + $0.49 |

---

## 9. Testing

- Stripe test mode and PayPal sandbox for every button before going live
- Each button lands on the correct amount and description
- Return URL reaches `thank-you.html` from both providers
- Layout holds on mobile — the two-button block is the tightest case
- No placeholder link remains reachable in production

---

## 10. Deferred — workstream 3: paid courses and exams

Not designed here. The findings that constrain it are recorded so they are not
rediscovered later.

**AHA certification cannot be delivered by the website.** BLS certification is
never completed fully online: the official path is HeartCode (AHA's own online
product) *plus* an in-person hands-on skills session. Andrée is an AHA
instructor. A site implying certification by online exam would mislead students
and put her instructor credential at risk.

The legitimate — and more profitable — shape: the site hosts preparation
material and practice quizzes, and the payment buttons sell **the in-person
skills session**, which only an AHA instructor can deliver. The site feeds her
real product instead of competing with it.

**Paid, gated content cannot run on GitHub Pages.** Andrée's courses are to be
restricted to paying clients, which requires user accounts and a server. A
static site cannot withhold a page, hide an answer key from "View Source",
record who passed, or issue a verifiable certificate.

### Accounts required — gathered 2026-08-04

Three roles, not two:

| Role | Purpose | Status |
|---|---|---|
| Andrée — admin | Publishes courses, sees enrolments, marks exams | Clear |
| CPR — student | Course material and exams, paid and gated | Clear |
| Notary — ? | A separate login with a different role | **Undefined** |

**Andrée teaches CPR only. She does not train notaries.** That single fact
decides the architecture: a course platform answers the CPR half completely and
does not answer the notary half at all, because the notary space is not training.
Whatever it turns out to be — case tracking, document exchange, appointment
history — it is a different kind of product and needs its own answer.

Partly answered 2026-08-04: Andrée is a commissioned notary and performs notarial
work — signings, wedding officiating. The notary space is therefore **service
delivery, not teaching**. It is a client space, not a student space.

**If it is meant to enable remote notarization, it cannot be built.**
Massachusetts authorises remote online notarization under MGL c.222 §28 (St.
2023 c.2), but only on a platform approved by the Commonwealth. The notary must
also complete a training course approved by the Secretary of the Commonwealth
and file a notification form before performing any remote session, and must be
physically in Massachusetts during the act. Sources consulted were secondary;
confirm with the Secretary of the Commonwealth before acting on this.

**If it is the simpler thing** — book an appointment, send documents ahead so
Andrée can check they are in order, collect them afterwards — that is buildable,
but it is scheduling plus secure file exchange, not a course platform.

**Data warning.** A notary client space holds government IDs, deeds and powers of
attorney. That is among the most sensitive data a small site can hold, and
building it in-house means owning the breach risk permanently. For a one-person
business this argues strongly against a custom build.

**Recommendation: two needs, two tools.** A course platform for CPR. For notary,
start with appointment booking only — many mobile notaries never need more — and
add document exchange only if real demand appears.

Note on structure: two entirely separate login systems were requested. One
account with two entitlements is normally better — a person enrolled in both
keeps one password, and Andrée keeps one roster. Separate systems are justified
only if the two audiences must never overlap. Not yet decided.

On the admin login specifically: on a hosted platform it costs nothing — the
owner account *is* the admin. On an own backend every role has to be built and
secured. This requirement argues for the platform option.

Options priced 2026-08-03, decision postponed:

- **External platform** (Teachable $39–499/mo, Thinkific $49–199/mo, Podia
  $39–199/mo). Accounts, gating, graded quizzes, certificates and progress
  tracking already built and maintained. All support Stripe and PayPal. Thinkific
  and Podia have withdrawn their free tiers.
- **Own backend** on Vercel/Netlify. Full control, no platform subscription, but
  authentication, exam engine, grading and certificates must be built — and the
  security and maintenance of student personal data owned indefinitely.
- **Auth bolted onto the static site** (Memberstack, Outseta, $25–49/mo).
  Provides accounts and gating but no graded exams or certificates, so those
  still need building. Subscription *and* development.

Whichever is chosen: a platform certificate is **not** an AHA card. It must be
labelled "course completion", never "BLS certification".

---

## 11. Sources

- Stripe — PayPal availability: https://docs.stripe.com/payments/paypal
- Stripe — PayPal custom payment method: https://docs.stripe.com/payments/payment-methods/custom-payment-methods/paypal
- Stripe — Payment Links: https://docs.stripe.com/payment-links
- PayPal — buy buttons: https://developer.paypal.com/payment-links-buttons/create-buy-button
- AHA — BLS course options: https://cpr.heart.org/en/courses/basic-life-support-course-options
- AHA — HeartCode BLS: https://shopcpr.heart.org/heartcode-bls
- Massachusetts notary fees: https://legalclarity.org/massachusetts-notary-fees-regulations-and-guidelines/
