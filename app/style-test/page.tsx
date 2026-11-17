import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Style test - design tokens",
  description: "Internal page showing every design token, the type scale and sample components.",
  robots: { index: false, follow: false },
};

/*
 * Swatch labels only. The single source of truth for token values is the
 * :root block in app/globals.css (mirrored in design/tokens.md). All styling
 * on this page uses var() references or Tailwind token utilities - the value
 * strings below are never applied as styles. Keep the three files in sync
 * until a token build step exists.
 */
const palette = [
  {
    varName: "--background",
    value: "#faf9f7",
    role: "Page background",
    swatchClass: "bg-background",
  },
  {
    varName: "--surface",
    value: "#ffffff",
    role: "Cards, sheets, header",
    swatchClass: "bg-surface",
  },
  {
    varName: "--foreground",
    value: "#1c1917",
    role: "Primary text",
    swatchClass: "bg-foreground",
  },
  {
    varName: "--muted",
    value: "#78716c",
    role: "Secondary text, hairline borders",
    swatchClass: "bg-muted",
  },
  {
    varName: "--accent",
    value: "#1c1917",
    role: "Primary actions, links",
    swatchClass: "bg-accent",
  },
  {
    varName: "--danger",
    value: "#b91c1c",
    role: "Errors, destructive actions",
    swatchClass: "bg-danger",
  },
  {
    varName: "--success",
    value: "#15803d",
    role: "Open now badge, success states",
    swatchClass: "bg-success",
  },
];

const typeScale = [
  { step: "Display", className: "font-display text-5xl", usage: "Hero headline only" },
  { step: "Heading 1", className: "font-display text-4xl", usage: "Section titles" },
  { step: "Heading 2", className: "font-display text-3xl", usage: "Sub-sections" },
  { step: "Heading 3", className: "font-display text-2xl", usage: "Card titles" },
  { step: "Body", className: "font-body text-base", usage: "Paragraphs" },
  { step: "Small", className: "font-body text-sm", usage: "Labels, captions, prices" },
];

const spacingSteps = [
  { label: "1 (4px)", barClass: "w-4" },
  { label: "2 (8px)", barClass: "w-8" },
  { label: "3 (12px)", barClass: "w-12" },
  { label: "4 (16px)", barClass: "w-16" },
  { label: "6 (24px)", barClass: "w-24" },
  { label: "8 (32px)", barClass: "w-32" },
  { label: "12 (48px)", barClass: "w-48" },
];

export default function StyleTestPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <p className="rounded-card border border-muted/40 bg-surface px-4 py-3 text-sm text-muted">
        Provisional tokens: design/theme.png is missing, so every value on this page is a neutral
        placeholder, not the cafe&apos;s brand. Each token is marked TODO(theme) in design/tokens.md
        and gets replaced once the owner supplies the theme image or a palette.
      </p>

      <h1 className="mt-10 font-display text-4xl">Style test</h1>
      <p className="mt-2 text-muted">
        Every token, the type scale, and sample components. Internal page, not indexed.
      </p>

      {/* Palette */}
      <section className="mt-12">
        <h2 className="font-display text-3xl">Palette</h2>
        <ul className="mt-6 divide-y divide-muted/20 border-y border-muted/20">
          {palette.map((token) => (
            <li key={token.varName} className="flex items-center gap-4 py-3">
              <span
                className={`h-10 w-16 shrink-0 rounded border border-muted/30 ${token.swatchClass}`}
                style={{ backgroundColor: `var(${token.varName})` }}
              />
              <span className="font-mono text-sm">{token.varName}</span>
              <span className="font-mono text-sm text-muted">{token.value}</span>
              <span className="text-sm text-muted">{token.role}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* Type scale */}
      <section className="mt-12">
        <h2 className="font-display text-3xl">Type scale</h2>
        <p className="mt-2 text-sm text-muted">
          Display font is provisional (Fraunces via next/font). Body font is provisional (Public
          Sans via next/font).
        </p>
        <ul className="mt-6 space-y-6">
          {typeScale.map((item) => (
            <li key={item.step}>
              <p className="text-sm text-muted">
                {item.step} - {item.usage}
              </p>
              <p className={item.className}>Sample text, plainly written</p>
            </li>
          ))}
        </ul>
      </section>

      {/* Shape language */}
      <section className="mt-12">
        <h2 className="font-display text-3xl">Shape language</h2>
        <div className="mt-6 rounded-card border border-muted/30 bg-surface p-6 shadow-sm">
          <h3 className="font-display text-2xl">Card sample</h3>
          <p className="mt-2 text-muted">
            Cards use the surface token, the card radius (12px, provisional) and a 1px hairline
            border at reduced opacity. Shadow is soft and low. Real menu cards arrive in Phase 1.
          </p>
        </div>
        <ul className="mt-4 space-y-1 text-sm text-muted">
          <li>Corner radius: 12px on cards and buttons (TODO theme).</li>
          <li>Borders: 1px hairlines, muted token at 20-40% opacity.</li>
          <li>Shadows: soft, low elevation only.</li>
          <li>Texture/grain: not decided - ask the owner (PRD Section 5.11).</li>
        </ul>
      </section>

      {/* Buttons */}
      <section className="mt-12">
        <h2 className="font-display text-3xl">Buttons</h2>
        <div className="mt-6 flex flex-wrap gap-4">
          <button
            type="button"
            className="rounded-card bg-accent px-5 py-2.5 text-sm text-surface transition-opacity hover:opacity-90"
          >
            Primary action
          </button>
          <button
            type="button"
            className="rounded-card border border-muted/40 bg-surface px-5 py-2.5 text-sm text-foreground transition-colors hover:border-foreground"
          >
            Secondary action
          </button>
          <button
            type="button"
            className="rounded-card px-5 py-2.5 text-sm text-danger underline underline-offset-2"
          >
            Destructive text action
          </button>
        </div>
      </section>

      {/* Spacing rhythm */}
      <section className="mt-12">
        <h2 className="font-display text-3xl">Spacing rhythm</h2>
        <p className="mt-2 text-sm text-muted">
          Base unit 4px (Tailwind default scale: 1 = 4px). Components use multiples of
          4/8/12/16/24/32/48.
        </p>
        <ul className="mt-6 space-y-2">
          {spacingSteps.map((step) => (
            <li key={step.label} className="flex items-center gap-4">
              <span className={`h-4 bg-accent/80 ${step.barClass}`} aria-hidden="true" />
              <span className="text-sm text-muted">{step.label}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* Mood */}
      <section className="mt-12">
        <h2 className="font-display text-3xl">Mood</h2>
        <p className="mt-2 text-muted">
          TODO(theme): mood words come from the theme image and are not invented. Pending
          design/theme.png from the owner.
        </p>
      </section>
    </main>
  );
}
