# Cafe landing page

Single-page site for a cafe: hero, menu with photos and prices, cart, online
payment (Razorpay, UPI first), gallery, about, links panel, feedback form.
Spec: [docs/PRD.md](docs/PRD.md). Work is delivered phase by phase
(PRD Section 11); working rules live in [AGENTS.md](AGENTS.md).

## Status

| Phase | Scope                                         | Status                                              |
| ----- | --------------------------------------------- | --------------------------------------------------- |
| 0     | Foundation: scaffold, tokens, style test page | Done, with provisional tokens (theme image missing) |
| 1     | Static layout                                 | Not started                                         |
| 2     | Motion layer                                  | Not started                                         |
| 3     | Cart                                          | Not started                                         |
| 4     | Orders and payment                            | Not started                                         |
| 5     | Links panel and feedback                      | Not started                                         |
| 6     | Polish and launch                             | Not started                                         |

> **Design tokens are provisional.** `design/theme.png` is missing, so
> [design/tokens.md](design/tokens.md) carries neutral `TODO(theme)`
> placeholders wired through `app/globals.css`. They must be replaced before
> Phase 1 UI work; the open questions are listed in that file.

## Stack

- Next.js 16 (App Router) + TypeScript, strict mode
- Tailwind CSS 4, design tokens as CSS variables mapped in `@theme inline`
- Fonts via `next/font`
- ESLint 9 (flat config, eslint-config-next) + Prettier
- Tests: Vitest, added with Phase 3 pricing tests
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

## Scripts

| Script                 | What it does     |
| ---------------------- | ---------------- |
| `npm run dev`          | Dev server       |
| `npm run build`        | Production build |
| `npm run lint`         | ESLint           |
| `npm run type-check`   | `tsc --noEmit`   |
| `npm run format`       | Prettier write   |
| `npm run format:check` | Prettier check   |

## Structure

Mirrors PRD Section 9:

```
/app           pages and API routes
/components    Hero, Menu, MenuCard, Cart, About, LinksPanel, FeedbackForm, Visit, Header
/content       menu.json, site.json, copy.md
/lib           pricing.ts, payments/, db.ts, motion.ts, hours.ts
/public        /menu, /brand, /gallery
/design        theme.png (pending), tokens.md
/docs          PRD.md, payments.md (Phase 4), content-guide.md
```

## Conventions

- Tokens only: no hard-coded hex values or fonts in components (PRD Section 4).
- Menu, hours, copy and links come from `/content`, never hard-coded.
- Prices are always computed on the server from `content/menu.json`; client
  prices are never trusted.
- Secrets live in `.env.local` (never committed) and in Vercel project
  environment variables; `.env.example` documents every key with empty values.
