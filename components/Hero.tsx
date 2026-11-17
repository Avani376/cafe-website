import { OpenCartButton } from "./OpenCartButton";
import { Reveal } from "./Reveal";
import { Steam } from "./Steam";

/*
 * Hero (PRD Section 6.2): one confident line, primary "See the menu",
 * secondary "Order for pickup". Left-aligned with an asymmetric 7/5 column
 * split - no centered headline-and-two-pills pattern (anti-slop rule 7).
 * The photo area is a flat theme-colored placeholder with a cup illustration
 * until the owner provides the real hero photo (PRD Section 5.9).
 */
export function Hero({
  headline,
  cafeName,
  tagline,
}: {
  headline: string;
  cafeName: string;
  tagline: string;
}) {
  return (
    <section id="top" className="scroll-mt-24">
      <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 pb-16 pt-10 md:grid-cols-12 md:pt-20">
        <Reveal className="md:col-span-7">
          <p className="text-sm uppercase tracking-widest text-muted">{tagline}</p>
          <h1 className="mt-4 font-display text-5xl leading-tight text-foreground md:text-6xl">
            {headline}
          </h1>
          <p className="mt-8 flex flex-wrap gap-3">
            <a
              href="#menu"
              className="rounded-card bg-accent px-6 py-3 text-sm text-surface transition-opacity hover:opacity-90"
            >
              See the menu
            </a>
            <OpenCartButton
              label="Order for pickup"
              className="rounded-card border border-muted/40 bg-surface px-6 py-3 text-sm text-foreground transition-colors hover:border-foreground"
            />
          </p>
        </Reveal>

        <Reveal delay={0.04} className="md:col-span-5">
          <div className="relative flex aspect-4/5 items-center justify-center overflow-hidden rounded-card border border-muted/20 bg-surface md:aspect-3/4">
            <Steam className="h-24 w-24 text-muted" />
            {/* TODO(content): replace this flat placeholder with the cafe's
                own photo (owner input, PRD Section 14.1). */}
            <span className="absolute bottom-3 right-4 text-xs text-muted/70">{cafeName}</span>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
