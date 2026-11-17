# Cafe landing page

Single-page site for a cafe: hero, menu with photos and prices, cart, online
payment (Razorpay, UPI first), gallery, about, links panel, feedback form.
Spec: [docs/PRD.md](docs/PRD.md). Work is delivered phase by phase
(PRD Section 11); working rules live in [AGENTS.md](AGENTS.md).

## Status

| Phase | Scope                                         | Status                                                                |
| ----- | --------------------------------------------- | --------------------------------------------------------------------- |
| 0     | Foundation: scaffold, tokens, style test page | Done - theme v1 applied                                               |
| 1     | Static layout                                 | Done - placeholder photos/copy pending owner                          |
| 2     | Motion layer                                  | Done - reduced-motion fallbacks throughout                            |
| 3     | Cart                                          | Done - persisted, pricing unit-tested                                 |
| 4     | Orders and payment (Razorpay test mode)       | Done - logic tested; live keys and webhook registration pending owner |
| 5     | Links panel and feedback                      | Not started (links panel already rendered from site.json)             |
| 6     | Polish and launch                             | Not started                                                           |

> **Theme v2 "Ember After Dark" applied.** Adapted from the owner's dark
> elegant reference: petrol-charcoal surfaces, ivory text, ember-amber
> accent, subtle film grain, Playfair Display + Work Sans. Cafe name:
> **Ember & Ink**. Full rationale and WCAG AA contrast checks in
> [design/tokens.md](design/tokens.md); every value is overridable in one
> file (`app/globals.css`).
>
> **Content is placeholder.** Menu items, prices, hours, address, links and
> copy in `/content` are plainly-written stand-ins marked for owner
> confirmation (see [docs/content-guide.md](docs/content-guide.md)). Missing
> photos render as flat theme-colored placeholders (PRD Section 5.9).

## Stack

- Next.js 16 (App Router) + TypeScript, strict mode
- Tailwind CSS 4, design tokens as CSS variables mapped in `@theme inline`
- Fonts via `next/font`
- Motion (`motion` package) in client components, transform/opacity only
- Zustand (cart, persisted) + Zod (request validation)
- SQLite via Drizzle for orders/payments (Supabase Postgres is the
  production swap; see docs/payments.md)
- ESLint 9 (flat config, eslint-config-next) + Prettier + Vitest
- Hosting: Vercel

## Getting started

Requires Node >= 20.9 (built with Node 24).

```sh
npm install
cp .env.example .env.local   # fill in when a phase needs keys
npm run dev
```

Open http://localhost:3000. The internal token showcase is at
http://localhost:3000/style-test (not indexed).

Without Razorpay keys the cart still works end to end: use **Pay at
counter** - online checkout reports "not set up" (PRD Section 10,
Resilience).

## Scripts

| Script                 | What it does                              |
| ---------------------- | ----------------------------------------- |
| `npm run dev`          | Dev server (creates db/ first)            |
| `npm run build`        | Production build                          |
| `npm run start`        | Serve the production build                |
| `npm run lint`         | ESLint                                    |
| `npm run type-check`   | `tsc --noEmit`                            |
| `npm run test`         | Vitest (pricing, signatures, idempotency) |
| `npm run format`       | Prettier write                            |
| `npm run format:check` | Prettier check                            |

## Structure

Mirrors PRD Section 9:

```
/app           page, style-test, api/orders, api/payments/verify, api/webhooks/razorpay
/components    Header, Hero, Menu, MenuCard, ItemDetailSheet, CartDrawer, About, Visit, ...
/content       menu.json, site.json, copy.md
/lib           pricing.ts, orders.ts, payments/, db.ts, motion.ts, hours.ts, cart-store.ts
/public        /menu, /brand, /gallery
/design        theme.png (pending), tokens.md
/docs          PRD.md, payments.md, content-guide.md
/tests         Vitest suites
```

## Conventions

- Tokens only: no hard-coded hex values or fonts in components (PRD Section 4).
- Menu, hours, copy and links come from `/content`, never hard-coded.
- Prices are always computed on the server from `content/menu.json`; client
  prices are never trusted. Money is integer rupees; paise exists only at the
  Razorpay boundary.
- Secrets live in `.env.local` (never committed) and in Vercel project
  environment variables; `.env.example` documents every key with empty values.
