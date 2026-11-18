"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";

/*
 * Fly-to-cart (PRD Section 7, "Add to cart" row): a small copy of the item
 * image flies from the card to the cart icon. MenuCard and ItemDetailSheet
 * dispatch the FLY_EVENT with the image source and the card-image rectangle;
 * this component renders the flight as a fixed-position overlay animating
 * transform and opacity only, under 600 ms. Skipped under reduced motion
 * and for items without photos.
 */

export const FLY_EVENT = "ember-fly-to-cart";

export interface FlyEventDetail {
  src: string;
  from: { left: number; top: number; width: number; height: number };
}

interface Flight {
  id: number;
  src: string;
  from: FlyEventDetail["from"];
  to: { left: number; top: number; width: number; height: number };
}

export function FlyToCart() {
  const [flights, setFlights] = useState<Flight[]>([]);
  const nextId = useRef(0);

  useEffect(() => {
    function onFly(event: Event) {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      const detail = (event as CustomEvent<FlyEventDetail>).detail;
      const cartButton = document.querySelector('button[aria-label^="Open cart"]');
      if (!detail?.from || !cartButton) return;
      const to = cartButton.getBoundingClientRect();
      const id = ++nextId.current;
      setFlights((current) => [
        ...current,
        {
          id,
          src: detail.src,
          from: detail.from,
          to: { left: to.left, top: to.top, width: to.width, height: to.height },
        },
      ]);
      // Remove this flight when its animation has finished.
      window.setTimeout(() => {
        setFlights((current) => current.filter((flight) => flight.id !== id));
      }, 700);
    }
    window.addEventListener(FLY_EVENT, onFly);
    return () => window.removeEventListener(FLY_EVENT, onFly);
  }, []);

  return (
    <AnimatePresence>
      {flights.map((flight) => {
        const fromCx = flight.from.left + flight.from.width / 2;
        const fromCy = flight.from.top + flight.from.height / 2;
        const toCx = flight.to.left + flight.to.width / 2;
        const toCy = flight.to.top + flight.to.height / 2;
        return (
          <motion.div
            key={flight.id}
            className="pointer-events-none fixed z-60 h-20 w-20 overflow-hidden rounded-card border border-muted/30"
            style={{ left: toCx - 40, top: toCy - 40 }}
            initial={{ x: fromCx - toCx, y: fromCy - toCy, scale: 1, opacity: 0.95 }}
            animate={{ x: 0, y: 0, scale: 0.2, opacity: 0.6 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.55, ease: "easeIn" }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={flight.src} alt="" className="h-full w-full object-cover" />
          </motion.div>
        );
      })}
    </AnimatePresence>
  );
}
