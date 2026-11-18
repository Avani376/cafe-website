# Ember & Ink - cafe landing page

Single-page site for the cafe **Ember & Ink**: hero with photo, menu with
photos and prices, cart, online payments (sandbox now, Razorpay-ready),
gallery, about, links panel, feedback-ready structure.
Spec: [docs/PRD.md](docs/PRD.md). Work is delivered phase by phase
(PRD Section 11); working rules live in [AGENTS.md](AGENTS.md).

## Live site

**https://cafe-website-murex-seven.vercel.app**

- Menu, cart, Pay at counter and **sandbox online payments** all work there
  (`PAYMENT_MOCK=true`) - the sandbox sheet simulates Checkout success and
  failure with no real money.
- Orders on this deployment are stored in `/tmp` per serverless instance and
  reset with the instance - fine for the demo, not real bookkeeping (see
  Durable storage below).
- `/style-test` shows the design tokens (not indexed).

## Stack

- Next.js 16 (App Router) + TypeScript, strict mode
- Tailwind CSS 4, design tokens as CSS variables mapped in `@theme inline`
- Fonts via `next/font` (Playfair Display + Work Sans)
- Motion (`motion` package) in client components, transform/opacity only,
  reduced-motion fallbacks
- Zustand (cart, persisted) + Zod (request validation)
- SQLite via Drizzle locally; `/tmp` on Vercel; Supabase Postgres is the
  durable production target (see below)
- ESLint 9 (flat config, eslint-config-next) + Prettier + Vitest
- Hosting: Vercel

## Theme and name

Theme v2 **"Ember After Dark"** - dark petrol-charcoal surfaces, ivory text,
ember-amber accent, subtle film grain, Playfair Display + Work Sans - adapted
from the owner's dark elegant reference. Cafe name **Ember & Ink** was chosen
at the owner's request to match. Full rationale and WCAG AA contrast checks:
[design/tokens.md](design/tokens.md). Every value is overridable in one file
(`app/globals.css`).

## Getting started (local)

Requires Node >= 20.9.

```sh
npm install
cp .env.example .env.local   # set PAYMENT_MOCK=true for sandbox payments
npm run dev                  # http://localhost:3000
```

## Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `PAYMENT_MOCK` | for sandbox | `true` enables the sandbox payment provider (no real money) |
| `PAYMENT_MOCK_SECRET` | sandbox only | HMAC secret for sandbox captures (any dev string) |
| `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` | for real payments | Razorpay API keys (test keys first) |
| `RAZORPAY_WEBHOOK_SECRET` | for real payments | Webhook signature secret |
| `RESEND_API_KEY` / `NOTIFY_EMAIL` / `FROM_EMAIL` | optional | Order notifications (no-op when unset) |
| `DATABASE_URL` | optional | Restricted allowlist; Supabase Postgres comes via a driver swap, not this var |

Copy `.env.example` to `.env.local` locally, and set the same variables in
Vercel Project Settings for deployments. Real Razorpay keys take over from
the sandbox automatically - see [docs/payments.md](docs/payments.md).

## Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Dev server (creates db/ first) |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run lint` | ESLint |
| `npm run type-check` | `tsc --noEmit` |
| `npm run test` | Vitest (pricing, signatures, idempotency, sandbox) |
| `npm run format` | Prettier write |

## Deployment (Vercel)

The site is deployed with the Vercel CLI from this repo:

```sh
npx vercel login                    # device link in your browser
npx vercel link --yes --project cafe-website
npx vercel env add PAYMENT_MOCK production   # enter "true"
npx vercel deploy --prod --yes
```

Or import the repo in the Vercel dashboard (the repo is private on GitHub at
Avani376/cafe-website) and set the same env vars. `.vercelignore` keeps local
data (db/, .mimosa/, env files) out of deployments.

### Durable storage before real traffic

Serverless filesystems are read-only except `/tmp`, so on Vercel the orders
database runs at `/tmp/cafe.db` and is **per-instance and ephemeral**
(`lib/db.ts` handles the switch automatically). Before taking real orders,
swap the driver to Supabase Postgres (replace the driver import and column
types in `lib/db.ts` - all access goes through `lib/orders.ts`) and register
the webhook URL. Full checklist: [docs/payments.md](docs/payments.md).

## Structure

Mirrors PRD Section 9:

```
/app           page, style-test, api/orders, api/payments/*, api/webhooks/razorpay
/components    Header, Hero, Menu, MenuCard, ItemDetailSheet, CartDrawer, About, Visit, ...
/content       menu.json, site.json, copy.md
/lib           pricing.ts, orders.ts, payments/, db.ts, motion.ts, hours.ts, cart-store.ts
/public        /menu (dish photos), /gallery (hero, about), /brand
/design        tokens.md (theme source of truth), theme.png (pending)
/docs          PRD.md, payments.md, content-guide.md
/tests         Vitest suites
```

## Conventions

- Tokens only: no hard-coded hex values or fonts in components (PRD Section 4).
- Menu, hours, copy and links come from `/content`, never hard-coded.
- Prices are always computed on the server from `content/menu.json`; client
  prices are never trusted. Money is integer rupees; paise exists only at the
  payment boundary.
- Menu photos are free-license Unsplash stand-ins matched to each dish -
  replace the files in `/public/menu/` (same filename) with the cafe's own
  photos before launch.
- Secrets live in `.env.local` (never committed) and in Vercel project
  environment variables; `.env.example` documents every key with empty values.
