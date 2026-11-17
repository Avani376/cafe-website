# Content guide

All menu, hours, copy and links live in `/content` and are read by
`lib/content.ts` at request time on the server. Components never hard-code
them (working rule 4).

> **Status: PLACEHOLDER content.** Everything in this folder must be
> confirmed or replaced by the owner before launch (PRD Sections 14 and 13).

## menu.json

- `categories`: tab order.
- `items[]`:
  - `id` - stable slug, used by the cart and the order API. The client sends
    only ids and quantities to `POST /api/orders`; the server recomputes all
    prices from this file (working rule 5).
  - `price` - **INR integer in rupees**. Never paise in this file. The only
    paise conversion happens at the Razorpay boundary (`lib/pricing.ts`).
  - `image` - path under `/public/menu/`. When the file is missing the UI
    renders a flat theme-colored placeholder with the item name
    (PRD Section 5.9). Never use stock or AI photos.
  - `diet` - `veg` / `non-veg`, rendered as the standard Indian square marks.
  - `tags` - free-form (`bestseller`, `new`); rendered as small badges.
  - `available` - `false` keeps the card visible but disabled with a
    Sold out label.
  - `pairsWith` - item ids suggested in the cart.
  - `options[].id` - stable id; the client sends option ids, the server
    matches them against this file. (Schema extension beyond the PRD example;
    needed so the client never sends prices.)
- Sold out toggle for the owner: flip `available` to `false` (PRD Section 8.6).

## site.json

- `hours` - per-day array of `[open, close]` windows in 24h local time;
  `timezone` is the cafe's IANA zone (Asia/Kolkata). `lib/hours.ts` computes
  the Open now badge, the hours table and pickup slots from this.
- `links` - two groups (`cafe`, `owner`); rendered by LinksPanel, opened in
  new tabs with `rel="noopener noreferrer"`.

## copy.md

`key: value` lines. Keys in use: `hero.headline`, `about.story`,
`cart.emptyLine`, `notfound.line`, `success.line`, `paymentFailure.line`,
`privacy.note`. Every line is marked `COPY: confirm with owner` until the
owner rewrites it.
