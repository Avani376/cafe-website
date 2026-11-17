import { Reveal } from "./Reveal";
import { LinksPanel } from "./LinksPanel";
import type { Site } from "@/lib/content";

/*
 * About section (PRD Section 6.6): short story from copy.md, two photo
 * placeholders (flat, theme-colored - real photos come from the owner), and
 * the links panel. Asymmetric 7/5 layout, body text left-aligned.
 */
export function About({ site, story }: { site: Site; story: string }) {
  return (
    <section id="about" className="scroll-mt-24 border-t border-muted/10">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 md:grid-cols-12">
        <Reveal className="md:col-span-7">
          <h2 className="font-display text-4xl text-foreground">About</h2>
          <p className="mt-6 max-w-prose text-muted">{story}</p>
          <p className="mt-4 max-w-prose text-sm text-muted/80">
            {/* TODO(content): year opened, what you roast or bake, who runs
                it (PRD Section 6.6) - owner input pending. */}
            Opened 2024. Espresso and a small morning bake list. Run by the owner with two people on
            the floor.
          </p>
        </Reveal>

        <Reveal delay={0.04} className="flex flex-col gap-4 md:col-span-5">
          <div className="flex aspect-4/3 items-center justify-center rounded-card border border-muted/20 bg-surface">
            {/* TODO(content): real about photos from the owner. */}
            <span className="text-xs text-muted/70">Photo pending</span>
          </div>
          <div className="ml-auto flex aspect-3/2 w-3/4 items-center justify-center rounded-card border border-muted/20 bg-surface">
            <span className="text-xs text-muted/70">Photo pending</span>
          </div>
          <LinksPanel site={site} className="mt-2 grid grid-cols-2 gap-6" />
        </Reveal>
      </div>
    </section>
  );
}
