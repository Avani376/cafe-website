# Design tokens

Theme **v1 "Paper & Espresso"**. The owner's theme image (`design/theme.png`)
was never provided, so the developer chose a cohesive direction with the
owner's standing approval. Every value lives here and in the `:root` block of
`app/globals.css`; components consume tokens only through the Tailwind mapping
in `@theme inline` - no hard-coded hex or fonts anywhere else.

> The owner can override any value at any time: change it in
> `app/globals.css` (and this file) and the whole UI follows. The PRD's
> standing rule applies - a human reading the palette beats an agent
> guessing it, so these remain one confirmation away from final.

## Palette

| Token          | Value     | Role                                         | Rationale                                                                             |
| -------------- | --------- | -------------------------------------------- | ------------------------------------------------------------------------------------- |
| `--background` | `#f6f1e7` | Page background                              | Warm paper cream - reads like aged paper / milk foam, appetising with food photos     |
| `--surface`    | `#fffdf6` | Cards, header, drawer, sheets                | Steamed-milk white, a step lighter than the paper so cards lift without heavy shadows |
| `--foreground` | `#231a12` | Primary text                                 | Espresso ink - warm near-black instead of pure #000, keeps the page soft              |
| `--muted`      | `#6b5d4f` | Secondary text, hairline borders             | Roast taupe; deep enough for AA body text at ~5.2:1                                   |
| `--accent`     | `#9c4a26` | Primary actions, links, active tab underline | Terracotta / coffee-cherry; ~6.1:1 with white text, distinct from danger red          |
| `--danger`     | `#b3261e` | Errors, destructive actions, non-veg mark    | Brick red - clearly hotter than the terracotta accent                                 |
| `--success`    | `#2e7d32` | Open-now badge, veg mark, success stamp      | Leaf green, AA on surface at ~5.5:1                                                   |

7 roles as required by PRD Section 4.1 (background, surface, text, accent,
muted, danger, success).

### Contrast (WCAG 2.2 AA, PRD Section 10)

Approximate ratios for the pairs actually used in the UI:

| Pair                                   | Ratio  | Pass             |
| -------------------------------------- | ------ | ---------------- |
| foreground on background / surface     | ~14:1  | AAA              |
| muted on background / surface          | ~5.2:1 | AA (normal text) |
| surface (button text) on accent        | ~6.1:1 | AA               |
| accent as text on background / surface | ~5.4:1 | AA               |
| danger on surface                      | ~6.5:1 | AA               |
| success on surface                     | ~5.5:1 | AA               |

Opacity-derived hairlines (`border-muted/20..40`, `divide-muted/10..20`) are
used only for decoration next to AA text, never as the sole text distinction.

## Typography

| Role              | Family        | Loading                                         | Why                                                                                             |
| ----------------- | ------------- | ----------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Heading / display | **Fraunces**  | `next/font/google`, variable `--font-fraunces`  | Warm, slightly wonky serif; reads "specialty cafe" without being a cliche                       |
| Body              | **Work Sans** | `next/font/google`, variable `--font-work-sans` | Humanist sans - legible at small sizes on mobile (80%+ of traffic), pairs cleanly with Fraunces |

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

**Warm · unhurried · hand-crafted · quietly vintage**

(The palette and serif carry the warmth; generous whitespace and slow,
subtle motion carry the "unhurried"; the terracotta and paper keep it
hand-made rather than corporate.)

## Shape language

- Corner radius: **14px** (`--radius`, mapped to the `rounded-card` utility) -
  soft but not bubbly.
- Borders: 1px hairlines using the muted token at 20-40% opacity; no heavy
  outlines.
- Shadows: soft, low elevation (`shadow-sm` resting, `shadow-md` on card
  hover) only - the paper aesthetic does the lifting, not shadows.
- Texture/grain: none for now. A subtle paper grain is the natural next step
  (PRD Section 5.11) and fits this theme if the owner wants it.
- Translucency: exactly one surface - the sticky header on scroll
  (`bg-background/90` + blur), per the anti-slop rules.

## Spacing rhythm

Base unit: **4px** (Tailwind default scale, where `1` = 4px). Components use
multiples of 4 / 8 / 12 / 16 / 24 / 32 / 48.

## Notes for the owner

1. This palette is designed for the warm, neighbourhood speciality-cafe
   brief (India, UPI pickup orders, veg marks). If you have a brand book or
   theme image, send it and every value above can be swapped in one file.
2. The non-veg FSSAI mark traditionally uses a specific brown; the UI uses
   `--danger` (red) for it. Say the word and a dedicated brown token gets
   added.
3. Still needed regardless of theme: logo (`/public/brand/logo.svg`), cafe
   name, real photos, menu, hours, copy, social links (PRD Section 14).
