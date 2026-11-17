import Image from "next/image";
import { OpenCartButton } from "./OpenCartButton";
import { Reveal } from "./Reveal";
import { Steam } from "./Steam";

/*
 * Hero (PRD Sections 5.7, 6.2): the cafe's own photo, full-bleed and dark,
 * one confident line, primary "See the menu", secondary "Order for pickup".
 * A flat background-tinted scrim keeps the ivory text at AA contrast over
 * the photo (functional overlay, not decoration). The steam illustration
 * floats over the photo at low opacity and is disabled under reduced
 * motion. Left-aligned, no centered two-pill pattern.
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
      <div className="relative isolate overflow-hidden">
        <Image
          src="/gallery/hero.jpg"
          alt={`Inside ${cafeName}: warm lights, plants and a quiet table`}
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
        {/* Legibility scrim tinted with the page token */}
        <div className="absolute inset-0 bg-background/75" aria-hidden="true" />
        <Steam className="absolute right-[10%] top-[14%] h-24 w-24 text-muted/50" />

        <div className="relative mx-auto flex min-h-[76vh] max-w-6xl flex-col justify-center px-4 py-24">
          <Reveal>
            <p className="text-sm uppercase tracking-widest text-muted">{tagline}</p>
            <h1 className="mt-4 max-w-2xl font-display text-5xl leading-tight text-foreground md:text-6xl">
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
        </div>
        <p className="absolute bottom-3 right-4 text-xs text-muted/80">{cafeName}</p>
      </div>
    </section>
  );
}
