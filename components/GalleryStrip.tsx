import Image from "next/image";
import { Reveal } from "./Reveal";

/*
 * Ambience strip (PRD Sections 3 and 7): a slow ticker of cafe photos that
 * pauses on hover. The marquee animates transform only, and under
 * prefers-reduced-motion it becomes a plain horizontally scrollable row.
 */
const shots = [
  {
    src: "/gallery/g1.jpg",
    alt: "Wooden tables and the counter under fishing-net ceiling decor",
  },
  {
    src: "/gallery/g2.jpg",
    alt: "Pour-over coffee brewing with a gooseneck kettle",
  },
  {
    src: "/gallery/g3.jpg",
    alt: "Concrete wall with the coffee menu board and bicycles parked inside",
  },
  {
    src: "/gallery/g4.jpg",
    alt: "Espresso bar with exposed-bulb pendant lights",
  },
  {
    src: "/gallery/hero.jpg",
    alt: "The cafe from the doorway - chalkboard, plants and warm lamps",
  },
];

export function GalleryStrip() {
  return (
    <section className="border-t border-muted/10 py-16" aria-label="Cafe ambience">
      <div className="mx-auto max-w-6xl px-4">
        <Reveal>
          <h2 className="font-display text-4xl text-foreground">Inside the cafe</h2>
          <p className="mt-2 text-muted">A slow look around the room.</p>
        </Reveal>
      </div>
      <div className="ember-marquee mt-8 overflow-hidden">
        <div className="ember-marquee-track flex w-max">
          {[...shots, ...shots].map((shot, index) => (
            <div
              key={index}
              className="relative mr-4 h-64 w-96 shrink-0 overflow-hidden rounded-card border border-muted/20"
              aria-hidden={index >= shots.length}
            >
              <Image
                src={shot.src}
                alt={index < shots.length ? shot.alt : ""}
                fill
                sizes="384px"
                className="object-cover"
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
