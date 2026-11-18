import { MapPin, Phone } from "lucide-react";
import { Reveal } from "./Reveal";
import { HoursTable } from "./HoursTable";
import { LinksPanel } from "./LinksPanel";
import { ShareButton } from "./ShareButton";
import type { Site } from "@/lib/content";

/*
 * Visit section and footer (PRD Section 6.8): address, a linked map button
 * (no heavy iframe), hours table with today highlighted, tel: phone link,
 * links panel repeat, copyright.
 */
export function Visit({ site }: { site: Site }) {
  return (
    <section id="visit" className="scroll-mt-24 border-t border-muted/10">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 md:grid-cols-12">
        <Reveal className="md:col-span-5">
          <h2 className="font-display text-4xl text-foreground">Visit</h2>
          <p className="mt-6 flex items-start gap-2 text-muted">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden="true" />
            <span>{site.address}</span>
          </p>
          <p className="mt-3 flex items-center gap-2 text-muted">
            <Phone className="h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden="true" />
            <a
              href={`tel:${site.phone.replace(/[^+\d]/g, "")}`}
              className="text-foreground underline underline-offset-2"
            >
              {site.phone}
            </a>
          </p>
          <a
            href={site.mapUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 inline-block rounded-card border border-muted/40 bg-surface px-5 py-2.5 text-sm text-foreground transition-colors hover:border-foreground"
          >
            Open in Google Maps
          </a>
          <div className="mt-3">
            <ShareButton cafeName={site.name} />
          </div>
        </Reveal>

        <Reveal delay={0.04} className="md:col-span-4">
          <HoursTable site={site} />
        </Reveal>

        <Reveal delay={0.08} className="md:col-span-3">
          <LinksPanel site={site} className="grid grid-cols-1 gap-6" />
        </Reveal>
      </div>
    </section>
  );
}

export function Footer({ site }: { site: Site }) {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-muted/10">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-8">
        <p className="text-sm text-muted">
          {`© ${year} ${site.name}`} · {site.address}
        </p>
        <nav aria-label="Footer" className="flex gap-5 text-sm text-muted">
          <a href="#menu" className="hover:text-foreground">
            Menu
          </a>
          <a href="#about" className="hover:text-foreground">
            About
          </a>
          <a href="#visit" className="hover:text-foreground">
            Visit
          </a>
          <a href="#feedback" className="hover:text-foreground">
            Feedback
          </a>
        </nav>
      </div>
    </footer>
  );
}
