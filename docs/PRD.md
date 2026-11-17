# Cafe Landing Page: Product Requirements Document

Version 1.0 · Written to be handed to a coding agent (Codex or Zcode) phase by phase

> Transcribed into the repo from the owner's PDF so the source of truth travels
> with the code (PRD Section 12). Treat this file as canonical.

## 0. Read this first (for the human)

- **Theme reference:** I could not see a theme file in your message. Put your theme image or screenshot at `/design/theme.png` in the repo before starting. Section 4 tells the agent to extract colors, type and mood from it. Fill in the `TODO` fields in Section 4 yourself if you can, because a human reading the palette beats an agent guessing it.
- **Real content is your job:** Real menu photos, real prices, real hours, real social handles. Agents will fill gaps with generic filler unless you give them real data in `/content`.
- **How to use with two agents:** Section 12 is a short rules block. Save it as `AGENTS.md` in the repo root (Codex reads this file automatically). For Zcode, paste the same block as the first message of the session. Then feed the phases in Section 11 one at a time, not the whole document at once.

## 1. Product summary

A single-page website for a cafe. A visitor lands, feels the place, browses the menu with photos and prices, adds items to an order, and pays online. They can also read about the cafe, find the cafe's and owner's social links in one click, and send feedback.

**Primary goal:** Convert a visit into a paid pickup or dine-in order. **Secondary goals:** Build brand feel, collect feedback, grow social following.

## 2. Users and key journeys

| User | Wants | Journey |
|---|---|---|
| Walk-in regular on phone | Order fast, skip the queue | Open site, tap item, add to cart, pay by UPI, get order number |
| First-time visitor | Know what the place is like | Scroll hero, gallery, about, menu |
| Customer after a visit | Tell the cafe what they thought | Open feedback, submit in under 30 seconds |
| Social follower | Find the cafe and the owner online | Open links panel, tap once |

Assume **80 percent or more of traffic is mobile**. Design mobile first.

## 3. Scope

**In scope (v1):**

- Hero, menu with photos and prices, cart, online payment, gallery or ambience strip, about, links panel, feedback form, footer with hours and map link.
- Framer Motion interactions listed in Section 7.
- Order record stored so the cafe can see it.

**Out of scope (v1):**

- User accounts and login.
- Delivery logistics and live rider tracking.
- Loyalty points.
- Full admin dashboard (a simple read-only orders view or email notification is enough).

## 4. Design system

### 4.1 Extract from the theme

The agent must open `/design/theme.png` and write its findings into `/design/tokens.md` **before writing any UI**. Required output:

- Palette: 5 to 7 colors with hex values and the role of each (background, surface, text, accent, muted, danger, success).
- Typography: the heading and body typefaces seen, or the closest Google Fonts match, plus a size scale.
- Mood words (three to five) taken from the image.
- Shape language: corner radius, border use, shadows or none, texture or grain.
- Spacing rhythm: base unit.

Human overrides, fill these if you know them:

```
TODO primary background:
TODO accent:
TODO heading font:
TODO body font:
TODO logo file: /public/brand/logo.svg
```

All colors and fonts go into CSS variables and the Tailwind theme. **No hard-coded hex values in components.**

### 4.2 Staying on-theme

- Every new component must use tokens only. If a needed color is missing from the theme, stop and ask, do not invent one.
- No elements that would look out of place in the reference image.

## 5. Anti AI-slop rules (hard constraints)

The site must look like a person with taste made it for this specific cafe. Violating any of these is a bug.

1. **No placeholder copy.** No lorem ipsum, no "Welcome to our website", no "Crafted with passion", no "Elevate your coffee experience". Copy comes from `/content/copy.md` written by the owner. If it is missing, use plainly written short lines and mark them `// COPY: confirm with owner`.
2. **No stock gradients.** No purple to blue gradients, no glowing orbs, no mesh blobs, no neon.
3. **No glassmorphism pile-ups.** At most one translucent surface (the sticky header on scroll).
4. **No emoji as icons.** Use one consistent icon set (Lucide) at one stroke width, or custom SVG.
5. **No three-identical-cards-in-a-row everywhere.** Vary layout: one featured item large, others smaller. Use asymmetry and overlap with intent.
6. **No centered-everything layout.** Left-align body text. Use a grid with a clear column logic.
7. **No generic hero pattern** of big centered headline, subtitle and two pill buttons. The hero must use the cafe's own photo and one confident line.
8. Type **pairing is from the theme**, not defaulted to Inter or Poppins unless the theme uses them.
9. **Real photos only.** Menu images come from `/public/menu/`. Where a photo is missing, use a flat theme-colored placeholder with the item name, never an AI or stock image of a different dish.
10. **Motion has a reason.** Every animation must explain something (a state change, hierarchy, feedback). No parallax everywhere, no bounce on everything.
11. **Small imperfections are good:** a slightly rotated sticker-style badge, a hand-drawn underline SVG, subtle paper grain, if the theme supports it.
12. **Commit messages and code comments are written plainly**, no marketing language in code.

## 6. Functional requirements

### 6.1 Navigation

- Sticky header: logo, anchors (Menu, About, Visit, Feedback), cart button with item count badge.
- Mobile: compact bar plus a full-screen menu sheet. Cart button always reachable.
- Smooth scroll to sections, with offset for the header.
- Shows an **Open now / Closed, opens at 8 AM** badge computed from opening hours in `/content/site.json` using the cafe's timezone (Asia/Kolkata).

### 6.2 Hero

- One real photo (or short looping muted video under 2 MB), one headline, one primary action "See the menu" and one secondary "Order for pickup".
- Subtle steam rising from a cup illustration or photo overlay (SVG path animation, low opacity). Disabled under reduced motion.

### 6.3 Menu (the core of the page)

- Data lives in `/content/menu.json`, not in components.
- Item shape:

```json
{
  "id": "flat-white",
  "name": "Flat White",
  "category": "coffee",
  "description": "Double ristretto, steamed milk.",
  "price": 180,
  "image": "/menu/flat-white.jpg",
  "diet": ["veg"],
  "tags": ["bestseller"],
  "available": true,
  "options": [{ "label": "Oat milk", "price": 40 }]
}
```

- Prices **in INR as integers in rupees** (or paise, pick one and keep it consistent), shown with the rupee symbol and Indian number formatting.
- Category tabs with an animated active indicator (shared layout animation).
- Filters: Veg / Non-veg indicator (the standard Indian green and red square marks), and a search field for 20+ items.
- Each card: photo, name, short description, price, add button, optional tag.
- Item detail: tapping opens a sheet or modal with a larger image, options, quantity, and "Add to order".
- Sold-out items stay visible but disabled with a clear label.

### 6.4 Cart

- Slide-in drawer (bottom sheet on mobile). Shows line items, quantity steppers, option choices, subtotal, taxes if applicable, total.
- Persist in `localStorage` with a version key so a menu change does not break old carts.
- Order type: Pickup or Dine-in (table number field). Optional note field (limit 200 chars).
- Pickup time: "As soon as possible" or a slot within opening hours, at least 15 minutes ahead.

### 6.5 Payment

The cafe is in India, so the default provider is **Razorpay** (UPI, cards, netbanking, wallets). Keep the provider behind an interface so it can be swapped.

- Flow: client sends cart item IDs and quantities (never prices) to `POST /api/orders`. The server recomputes the total from `menu.json`, creates a Razorpay order, stores the order as `pending`, and returns the order ID.
- Client opens Razorpay Checkout. On success, client calls `POST /api/payments/verify`. Server verifies the signature with the secret key, marks the order `paid`.
- **Webhook** `POST /api/webhooks/razorpay` verifies the webhook signature and is the source of truth for payment status (handles the case where the user closes the tab after paying).
- Idempotency: the same payment cannot mark two orders paid, and verifying twice is harmless.
- Secrets only in environment variables. Never expose the secret key to the client.
- Add **Pay at counter** as an option that creates an order with status `pay_at_counter` and no online charge.
- Success screen: order number (short, readable, like `K-0412`), items, total, pickup time, and a prompt to take a screenshot.
- Failure screen: clear message, a retry button, cart preserved.
- Order notification: email to the cafe (Resend or SMTP) and optionally a WhatsApp or Telegram message. At minimum, orders are written to a database table the owner can view.
- Use **test mode** keys during development. A written checklist for going live goes in `/docs/payments.md`.

### 6.6 About section

- Short story of the cafe (owner supplied), one or two real photos, a few specifics (year opened, what you roast or bake, who runs it).
- **Links panel** with two clearly labeled groups, each link one click, opens in a new tab with `rel="noopener noreferrer"`:
  - *The cafe*: Instagram, Google Maps listing, WhatsApp, Facebook or any others.
  - *The owner*: personal Instagram, LinkedIn, X or any others.
- Links come from `/content/site.json` so the owner can edit without touching code.
- Optional: "Copy link" micro-interaction for sharing the cafe.

### 6.7 Feedback form

- Fields: name (optional), rating (1 to 5, tap targets at least 44 px), what they ordered (optional), message, contact (optional email or phone).
- Client and server validation with Zod. Friendly inline errors.
- Spam protection: honeypot field, simple rate limit by IP (for example 5 per hour), and optionally Cloudflare Turnstile.
- Submission goes to `POST /api/feedback`, saved to the database and emailed to the cafe.
- States: idle, submitting (button shows progress), success (warm, short thank-you message, form clears), error (message kept, retry possible).
- Do not collect more personal data than needed. Add a one-line privacy note.

### 6.8 Visit and footer

- Address, embedded or linked map (use a link button instead of heavy iframe unless lazy loaded), hours table with today highlighted, phone with `tel:` link, copyright, and links panel repeat.

## 7. Interaction and motion spec (Framer Motion)

Use the `motion` package (formerly framer-motion) in client components only. Keep a shared `motion.ts` file with the spring presets and durations so everything feels related.

| Element | Behavior | Notes |
|---|---|---|
| **Menu card hover (required)** | On pointer enter: card lifts (translateY -6px), image scales to 1.06 inside its mask, a price tag nudges, shadow deepens. Spring, not tween. | Use `whileHover`. Image zoom happens inside `overflow: hidden`. |
| Menu card cursor tilt | Subtle 3D tilt (max 5 degrees) following cursor via `useMotionValue` and `useSpring`. | Desktop pointer only. Disable on touch. |
| Add to cart | Button morphs into a stepper. A small copy of the item image flies to the cart icon, and the cart badge bumps. | Use `layoutId` or a measured flight. Keep under 600 ms. |
| Category tabs | Active underline slides between tabs using `layoutId`. Cards cross-fade and reflow with `AnimatePresence` and `layout`. | Avoid layout thrash with many items. |
| Cart drawer | Slides in with a spring and dims the page. Focus is trapped, Escape closes. | |
| Item detail sheet | Card image expands into the sheet (shared layout transition). | |
| Scroll reveal | Sections fade and rise 16 px once, using `whileInView` with `once: true`. | Never re-trigger. |
| Hero steam | Looping SVG path animation, very low opacity. | |
| Header | Shrinks and gains a thin border after 40 px scroll. | |
| Open now badge | A slow pulse on the dot only when open. | |
| Marquee strip | Slow ticker of menu highlights or house rules (optional). Pauses on hover. | |
| Success moment | After payment, a small stamp or checkmark draws itself. | |

**Motion rules:**

- Respect `prefers-reduced-motion`: replace movement with simple fades or nothing (`useReducedMotion`).
- Animate only `transform` and `opacity`. No animating width, height or top.
- Stagger lists by 40 ms or less. Total entrance for any section under 700 ms.
- No motion that blocks a click, no scroll hijacking.

## 8. Experience extras (chosen to help customers, not decorate)

1. **Open now badge** and pickup slots that respect real hours.
2. **Dietary filter** with Veg / Non-veg marks.
3. **"Pairs well with" suggestion** in the cart (for example a croissant with a latte), driven by a `pairsWith` field in the menu data.
4. **Bestseller and new tags** controlled from menu data.
5. **Reorder last order** from `localStorage` for returning customers.
6. **Sold out toggle** the owner can flip in `menu.json` (or later in a simple admin).
7. **Share button** using the Web Share API, falling back to copy link.
8. **Light personality:** a short, slightly funny empty-cart line written by the owner, a custom 404 in the cafe's voice.
9. **Installable PWA basics** (manifest, icons) so regulars can pin it to the home screen. Optional.
10. **Custom cursor** (small dot that grows over menu cards) on desktop only. Optional, remove if it feels gimmicky against the theme.

## 9. Tech stack

| Layer | Choice | Why |
|---|---|---|
| Framework | Next.js (App Router) + TypeScript | One repo for pages and API routes, easy deploy |
| Styling | Tailwind CSS with theme tokens as CSS variables | Fast, consistent, token-driven |
| Motion | `motion` (Framer Motion) | Required |
| Icons | Lucide | One consistent set |
| Forms | React Hook Form + Zod | Shared validation client and server |
| State | Zustand (cart) with persist middleware | Small and predictable |
| Payments | Razorpay (behind a `PaymentProvider` interface) | UPI first for India |
| Database | Supabase (Postgres) or SQLite via Drizzle for a simple start | Orders and feedback |
| Email | Resend | Order and feedback notifications |
| Images | `next/image`, AVIF/WebP, explicit sizes, blur placeholders | Speed |
| Hosting | Vercel | Simple, supports env vars and webhooks |
| Tests | Vitest for pricing and signature logic, Playwright for the order flow | Money code must be tested |

Suggested structure:

```
/app
  page.tsx
  /api/orders/route.ts
  /api/payments/verify/route.ts
  /api/webhooks/razorpay/route.ts
  /api/feedback/route.ts
/components    (Hero, Menu, MenuCard, Cart, About, LinksPanel, FeedbackForm, Visit, Header)
/content       (menu.json, site.json, copy.md)
/lib           (pricing.ts, payments/, db.ts, motion.ts, hours.ts)
/public        (/menu, /brand, /gallery)
/design        (theme.png, tokens.md)
/docs          (payments.md, content-guide.md)
```

## 10. Non-functional requirements

- **Performance:** Lighthouse mobile at least 90 for Performance, 95 for Accessibility, Best Practices and SEO. LCP under 2.5 s on 4G. Hero image preloaded. Menu images lazy loaded below the fold.
- **Accessibility:** WCAG 2.2 AA. Contrast checked for every token pair. Visible focus rings. Full keyboard use of menu, cart and form. Focus trap in drawers and modals. Meaningful `alt` text for each dish photo. Form errors announced with `aria-live`.
- **Security:** Server-side price calculation only. Signature verification on every payment event. Input validation on all API routes. Rate limiting on feedback and order creation. No secrets in client bundles. Security headers set.
- **Privacy:** Collect minimum data. Short privacy note. No third-party trackers by default. Plain analytics (Plausible or Vercel Analytics) only.
- **SEO:** Title, description, Open Graph image, `LocalBusiness` and `Menu` JSON-LD, sitemap, `robots.txt`.
- **Browser support:** Last two versions of Chrome, Safari, Firefox, Edge. iOS Safari and Android Chrome are the priority.
- **Resilience:** If JavaScript payment script fails to load, show a message and offer Pay at counter.

## 11. Delivery phases (feed these to the agent one at a time)

Each phase ends with a working app, passing lint and tests, and a short note of what changed. Do not start the next phase until the previous one is accepted.

**Phase 0: Foundation** Create the repo, TypeScript, Tailwind, ESLint, Prettier, folders from Section 9. Read `/design/theme.png` and write `/design/tokens.md`. Wire tokens into Tailwind and CSS variables. Load fonts with `next/font`. *Accept when:* a style test page shows every token, type scale and a sample button in theme.

**Phase 1: Static layout** Header, hero, menu grid reading `menu.json`, about, visit, footer. No motion yet beyond hover states from CSS. Fully responsive. *Accept when:* the page matches the theme at 375, 768 and 1280 px widths and passes the Section 5 checklist.

**Phase 2: Motion layer** Implement the Section 7 table. Create `lib/motion.ts` presets. Add reduced motion handling. *Accept when:* menu card hover works smoothly at 60 fps, tabs animate, and reduced motion mode removes movement.

**Phase 3: Cart** Zustand store, drawer, steppers, options, order type, pickup time, persistence. *Accept when:* cart survives refresh, totals are correct against unit tests in `pricing.ts`.

**Phase 4: Orders and payment** Database schema, `/api/orders`, Razorpay checkout in test mode, verify route, webhook, Pay at counter, success and failure screens, email notification. *Accept when:* a test payment marks an order paid, tampering with client prices has no effect, and replaying a webhook is harmless.

**Phase 5: Links panel and feedback** Links from `site.json` (cafe group and owner group). Feedback form with validation, spam protection, storage and email. *Accept when:* each link opens correctly, bad input is rejected on the server, and a submitted feedback appears in the database and the inbox.

**Phase 6: Polish and launch** SEO and JSON-LD, accessibility pass, Lighthouse pass, custom 404, favicon and manifest, content review with the owner, live Razorpay keys checklist, deploy. *Accept when:* Section 13 checklist is fully ticked.

## 12. Agent rules block (save as `AGENTS.md`, paste into Zcode as the first message)

```
You are building a landing page for a cafe. The full spec is in /docs/PRD.md.

Working rules:

1. Work on ONE phase at a time. Stop when its acceptance criteria are met and summarize.
2. Before any UI work, read /design/theme.png and /design/tokens.md. Use tokens only. Never hard-code colors or fonts.
3. Follow the Anti AI-slop rules in PRD Section 5 as hard constraints. No lorem ipsum, no emoji icons, no purple gradients, no generic centered hero.
4. All menu, hours, copy and links come from /content. Never hard-code them in components.
5. Prices are calculated on the server from menu.json. Never trust prices from the client.
6. Never put secrets in client code. Use .env.local and keep .env.example updated.
7. Use Framer Motion only in client components. Animate transform and opacity only. Respect prefers-reduced-motion.
8. Write tests for pricing, payment signature verification and the feedback validator.
9. Run lint, type-check and tests before declaring a phase done.
10. If something needed is missing (photo, copy, color, key), ask instead of inventing it.
11. Keep changes small and commits plain. Do not refactor unrelated files.
```

**Tool notes:** Both tools work best when given the PRD file in the repo and one phase per prompt. A good phase prompt is: "Read /docs/PRD.md and AGENTS.md. Do Phase 2 only. List the files you will touch before editing." If either tool loses context mid-phase, restart with the same prompt, since the PRD is the source of truth rather than the chat history. I do not know every Zcode feature, so if it has its own project-rules file, put the Section 12 block there too.

## 13. Launch checklist

- [ ] Real photos for every menu item, compressed under 150 KB each
- [ ] Final prices and availability in `menu.json`
- [ ] Owner-written copy in `copy.md`
- [ ] Hours, address, phone, map link verified
- [ ] Cafe and personal social links tested on mobile
- [ ] Razorpay live keys, webhook URL registered, test refund tried
- [ ] A real small order placed and received end to end
- [ ] Feedback email arrives and is not in spam
- [ ] Lighthouse and accessibility targets met
- [ ] Reduced motion mode checked
- [ ] Custom domain, HTTPS, analytics, sitemap submitted
- [ ] Section 5 checklist reviewed by a human who has not seen the build

## 14. Inputs the owner must provide

1. Theme reference image (`/design/theme.png`) and logo.
2. Menu list with names, short descriptions, prices, categories, veg or non-veg, and a photo for each.
3. Opening hours, address, phone, map link.
4. Short cafe story and a few lines of copy in your own voice.
5. Cafe social links and personal social links.
6. Razorpay account (test keys first), business email for notifications.
7. Decision on taxes (GST) display: inclusive prices or added at checkout.

## 15. Open questions

- Will orders be pickup and dine-in only, or is delivery planned for later?
- Who updates the menu: you in a JSON file, or do you want a small admin screen in v2?
- Is GST included in listed prices?
- Do you want WhatsApp order alerts in v1?
