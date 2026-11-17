# Design tokens

> **Status: PROVISIONAL.** `design/theme.png` does not exist in the repo yet,
> so every value below is a neutral placeholder, not the cafe's brand. The
> owner should provide the theme image or fill the values in directly
> (PRD Section 4.1 reserves these as TODO fields). Components consume tokens
> only through the Tailwind mapping in `app/globals.css` - no hard-coded hex
> or fonts anywhere else.

## Palette

| Token          | Value     | Role                             | Status                                     |
| -------------- | --------- | -------------------------------- | ------------------------------------------ |
| `--background` | `#faf9f7` | Page background                  | TODO(theme) provisional warm paper neutral |
| `--surface`    | `#ffffff` | Cards, sheets, header surface    | TODO(theme) provisional                    |
| `--foreground` | `#1c1917` | Primary text                     | TODO(theme) provisional                    |
| `--muted`      | `#78716c` | Secondary text, hairline borders | TODO(theme) provisional                    |
| `--accent`     | `#1c1917` | Primary actions, links           | TODO(theme) provisional neutral            |
| `--danger`     | `#b91c1c` | Errors, destructive actions      | TODO(theme) provisional                    |
| `--success`    | `#15803d` | Open now badge, success states   | TODO(theme) provisional                    |

7 roles as required by PRD Section 4.1 (background, surface, text, accent,
muted, danger, success).

## Typography

| Role              | Family      | Loading                                           | Status                        |
| ----------------- | ----------- | ------------------------------------------------- | ----------------------------- |
| Heading / display | Fraunces    | `next/font/google`, variable `--font-fraunces`    | TODO(theme) provisional serif |
| Body              | Public Sans | `next/font/google`, variable `--font-public-sans` | TODO(theme) provisional       |

Both are loaded in `app/layout.tsx` with `next/font` and mapped in the
`@theme inline` block of `app/globals.css` to `font-display` and `font-body`
utilities, with plain fallback stacks (Georgia / system-ui).

### Size scale

| Step      | Utility     | Size / line | Used for                 |
| --------- | ----------- | ----------- | ------------------------ |
| Display   | `text-5xl`  | 48 / 48px   | Hero headline only       |
| Heading 1 | `text-4xl`  | 36 / 40px   | Section titles           |
| Heading 2 | `text-3xl`  | 30 / 36px   | Sub-sections             |
| Heading 3 | `text-2xl`  | 24 / 32px   | Card titles              |
| Body      | `text-base` | 16 / 24px   | Paragraphs               |
| Small     | `text-sm`   | 14 / 20px   | Labels, captions, prices |

## Mood words

TODO(theme) - pending the theme image. Not invented; the owner supplies them
(PRD Section 4.1 requires three to five words taken from the image).

## Shape language

- Corner radius: 12px (`--radius`, mapped to the `rounded-card` utility). TODO(theme).
- Borders: 1px hairlines using the muted token at 20-40% opacity. TODO(theme).
- Shadows: soft, low elevation (`shadow-sm`) only. TODO(theme).
- Texture or grain: not decided. Ask the owner; PRD Section 5.11 allows subtle
  paper grain only if the theme supports it.

## Spacing rhythm

Base unit: **4px** (Tailwind default scale, where `1` = 4px). Components use
multiples of 4 / 8 / 12 / 16 / 24 / 32 / 48.

## Questions for the owner

1. `design/theme.png` is missing. Please add it to `/design/`, or reply with
   the palette (hex + role) and heading/body fonts directly.
2. Logo file `/public/brand/logo.svg` (PRD Section 4 TODO field) - missing.
3. Cafe name - needed for page metadata and branding; currently a plain
   placeholder, not invented.
4. Real content from PRD Section 14: menu items with photos and prices, hours,
   address, phone, map link, cafe story, social links. Needed from Phase 1 on.
5. GST display decision (PRD Section 14.7): inclusive prices or added at
   checkout? Needed before cart and pricing work (Phase 3).
6. Database choice (PRD Section 9): Supabase Postgres or SQLite via Drizzle?
   Needed by Phase 4.
