# Design tokens

Theme **v2 "Ember After Dark"** - adapted from the owner's reference images
(dark elegant restaurant theme): deep petrol-charcoal surfaces, warm ivory
text, ember-amber accent, subtle film grain. The cafe is named **Ember &
Ink** (owner-requested; _ember_ = the amber accent, _ink_ = the dark
editorial surface).

Every value lives here and in the `:root` block of `app/globals.css`;
components consume tokens only through the Tailwind mapping in
`@theme inline` - no hard-coded hex or fonts anywhere else. The owner can
override any value in one file and the whole UI follows.

## Palette

| Token          | Value     | Role                                         | Rationale                                                                                                 |
| -------------- | --------- | -------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `--background` | `#0e1618` | Page background, hero, footer                | Petrol charcoal with a faint teal cast, like the reference; carries the after-dark mood                   |
| `--surface`    | `#152022` | Cards, header, drawer, sheets                | Elevated dark for cards and overlays; keeps a single text direction (light on dark)                       |
| `--foreground` | `#efe6d5` | Primary text                                 | Warm ivory, like candlelight on the reference; ~14:1 on both dark surfaces                                |
| `--muted`      | `#a89c87` | Secondary text, hairline borders             | Lamp-lit taupe; ~6.5:1 on background and surface                                                          |
| `--accent`     | `#e0a13e` | Primary actions, links, active tab underline | Ember amber straight from the reference's buttons; ~8:1 as text on dark, ~7.5:1 with dark ink text on top |
| `--danger`     | `#e66854` | Errors, destructive actions, non-veg mark    | Warm signal red, lifted for AA on dark (~5.2:1); hotter than the amber accent                             |
| `--success`    | `#6fbf73` | Open-now badge, veg mark, success stamp      | Leaf green lifted for dark surfaces (~8:1)                                                                |

7 roles as required by PRD Section 4.1 (background, surface, text, accent,
muted, danger, success).

### Contrast (WCAG 2.2 AA, PRD Section 10)

Approximate ratios for the pairs actually used in the UI:

| Pair                                           | Ratio  | Pass             |
| ---------------------------------------------- | ------ | ---------------- |
| foreground (ivory) on background / surface     | ~14:1  | AAA              |
| muted on background / surface                  | ~6.5:1 | AA (normal text) |
| surface (dark ink) as button text on accent    | ~7.5:1 | AA               |
| accent (amber) as text on background / surface | ~8:1   | AA               |
| danger on background / surface                 | ~5.2:1 | AA               |
| success on background / surface                | ~8:1   | AA               |

One deliberate accessibility upgrade over the reference: its amber buttons
use white text (~2.2:1, fails AA). Ours use dark ink on amber (~7.5:1),
which also echoes the "Ink" in the cafe name.

Opacity-derived hairlines (`border-muted/20..40`, `divide-muted/10..20`) are
used only for decoration next to AA text, never as the sole text distinction.

## Typography

| Role              | Family               | Loading                                         | Why                                                                                                      |
| ----------------- | -------------------- | ----------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Heading / display | **Playfair Display** | `next/font/google`, variable `--font-playfair`  | High-contrast elegant serif - the exact tone of the reference's headings                                 |
| Body              | **Work Sans**        | `next/font/google`, variable `--font-work-sans` | Humanist sans - legible at small sizes on mobile (80%+ of traffic), neutral against the expressive serif |

Both load in `app/layout.tsx` with `next/font` (display: swap) and map to the
`font-display` / `font-body` utilities in `@theme inline`, with plain
fallback stacks (Georgia serif / system-ui sans).

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

**Moody · elegant · ember-lit · editorial · unhurried**

(Dark charcoal and amber carry the mood; Playfair carries the elegance;
the grain and hairlines keep it hand-made; slow subtle motion keeps it
unhurried.)

## Shape language

- Corner radius: **14px** (`--radius`, mapped to the `rounded-card` utility) -
  soft but not bubbly.
- Borders: 1px hairlines using the muted token at 20-40% opacity - the way
  the reference separates its dark panels.
- Shadows: minimal on a dark theme (shadows need light); elevation comes
  from the surface step (`#152022` on `#0e1618`) plus hairlines. Card hover
  keeps a soft shadow for depth.
- Texture/grain: **subtle film grain over the page** (`body::after`,
  feTurbulence data-URI at 5% opacity, non-interactive) - matches the
  reference's textured backdrop and is allowed by PRD Section 5.11.
- Translucency: exactly one surface - the sticky header on scroll
  (`bg-background/90` + blur), per the anti-slop rules.

## Spacing rhythm

Base unit: **4px** (Tailwind default scale, where `1` = 4px). Components use
multiples of 4 / 8 / 12 / 16 / 24 / 32 / 48.

## Notes for the owner

1. Cafe name **Ember & Ink** and the tagline were chosen per the owner's
   request to match this theme; say the word and both change in one file
   (`content/site.json`).
2. Dark theme, light theme, or a hybrid (dark hero + ivory menu panel, like
   the reference's shop page) are all one palette swap away.
3. The reference uses white cards on dark for its shop grid; v2 keeps
   elevated dark cards for a single consistent text direction. A light-panel
   variant is possible if preferred.
4. Still needed regardless of theme: logo (`/public/brand/logo.svg` - an
   amber-on-charcoal wordmark in Playfair would suit), real photos (dark,
   moody food photography will sit beautifully on this theme), menu, hours,
   copy, social links (PRD Section 14).
