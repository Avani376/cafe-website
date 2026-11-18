"use client";

import { useRef } from "react";
import Image from "next/image";
import { motion, useMotionValue, useReducedMotion, useSpring } from "motion/react";
import { Minus, Plus } from "lucide-react";
import { lineKey, useCart } from "@/lib/cart-store";
import { cardHover, imageHover, springs, tiltMax } from "@/lib/motion";
import { formatINR } from "@/lib/pricing";
import type { MenuItem } from "@/lib/content";
import { DietMark } from "./DietMark";
import { FLY_EVENT, type FlyEventDetail } from "./FlyToCart";

interface MenuCardProps {
  item: MenuItem;
  hasImage: boolean;
  featured?: boolean;
  onOpen: (item: MenuItem) => void;
}

/*
 * Menu card (PRD Sections 6.3 and 7).
 * - Hover: lifts 6 px on a spring; the photo scales to 1.06 inside an
 *   overflow-hidden mask; the price nudges; the shadow deepens via a CSS
 *   transition (shadow is not transform/opacity, so it stays CSS-only).
 * - Cursor tilt: max 5 degrees, desktop fine pointers only, disabled on
 *   touch and under reduced motion.
 * - The Add button morphs into a stepper via a shared layout id.
 */
export function MenuCard({ item, hasImage, featured = false, onOpen }: MenuCardProps) {
  const add = useCart((s) => s.add);
  const setQty = useCart((s) => s.setQty);
  const defaultQty = useCart(
    (s) => s.lines.find((l) => l.itemId === item.id && l.optionIds.length === 0)?.qty ?? 0,
  );
  const reduce = useReducedMotion();

  const soldOut = !item.available;
  const key = lineKey({ itemId: item.id, optionIds: [] });

  const rotateX = useMotionValue(0);
  const rotateY = useMotionValue(0);
  const tiltX = useSpring(rotateX, springs.soft);
  const tiltY = useSpring(rotateY, springs.soft);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const imageRef = useRef<HTMLDivElement | null>(null);

  // Fly-to-cart (PRD Section 7): dispatch the image flight for items with
  // photos; FlyToCart skips it under reduced motion.
  function flyImage() {
    if (!hasImage || !imageRef.current) return;
    const rect = imageRef.current.getBoundingClientRect();
    window.dispatchEvent(
      new CustomEvent<FlyEventDetail>(FLY_EVENT, {
        detail: {
          src: item.image,
          from: { left: rect.left, top: rect.top, width: rect.width, height: rect.height },
        },
      }),
    );
  }

  // Pointer capability is checked at event time - no state, no effect.
  function isFinePointer(): boolean {
    return typeof window !== "undefined" && window.matchMedia("(pointer: fine)").matches;
  }

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (!isFinePointer() || reduce || soldOut || !cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const px = (event.clientX - rect.left) / rect.width - 0.5;
    const py = (event.clientY - rect.top) / rect.height - 0.5;
    rotateY.set(Math.max(-tiltMax, Math.min(tiltMax, px * tiltMax * 2)));
    rotateX.set(Math.max(-tiltMax, Math.min(tiltMax, -py * tiltMax * 2)));
  }

  function resetTilt() {
    rotateX.set(0);
    rotateY.set(0);
  }

  const hoverVariants = reduce ? undefined : { rest: { y: 0 }, hover: { y: cardHover.y } };
  const imageVariants = reduce
    ? undefined
    : { rest: { scale: 1 }, hover: { scale: imageHover.scale } };
  const priceVariants = reduce ? undefined : { rest: { x: 0 }, hover: { x: 3 } };

  return (
    <motion.article
      layout
      variants={hoverVariants}
      initial="rest"
      whileHover={soldOut ? undefined : "hover"}
      exit={reduce ? { opacity: 0 } : { opacity: 0, y: 8 }}
      transition={springs.soft}
      className={`relative flex flex-col rounded-card border border-muted/20 bg-surface shadow-sm transition-shadow ${
        soldOut ? "opacity-70" : "hover:shadow-md"
      } ${featured ? "sm:col-span-2" : ""}`}
    >
      <motion.div
        ref={cardRef}
        onPointerMove={handlePointerMove}
        onPointerLeave={resetTilt}
        style={{ rotateX: tiltX, rotateY: tiltY, transformPerspective: 700 }}
        className="flex flex-1 flex-col"
      >
        <button
          type="button"
          onClick={() => !soldOut && onOpen(item)}
          disabled={soldOut}
          className="text-left"
          aria-label={soldOut ? `${item.name} is sold out` : `View details for ${item.name}`}
        >
          <div ref={imageRef} className="overflow-hidden rounded-t-card border-b border-muted/10">
            <motion.div
              variants={imageVariants}
              transition={springs.soft}
              layoutId={reduce ? undefined : `item-image-${item.id}`}
              className={`relative ${featured ? "aspect-16/9" : "aspect-4/3"}`}
            >
              {hasImage ? (
                <Image
                  src={item.image}
                  alt={`${item.name} - ${item.description}`}
                  fill
                  sizes={
                    featured ? "(min-width: 640px) 66vw, 100vw" : "(min-width: 1024px) 33vw, 100vw"
                  }
                  className="object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-accent/5">
                  <span className="font-display text-xl text-muted/80">{item.name}</span>
                </div>
              )}
            </motion.div>
          </div>
        </button>

        <div className="flex flex-1 flex-col gap-2 p-4">
          <div className="flex flex-wrap items-center gap-2">
            {item.diet[0] && <DietMark diet={item.diet[0]} />}
            <h3 className={`font-display text-foreground ${featured ? "text-2xl" : "text-lg"}`}>
              {item.name}
            </h3>
            {soldOut && (
              <span className="rounded border border-muted/30 px-2 py-0.5 text-xs text-muted">
                Sold out
              </span>
            )}
            {item.tags.map((tag) => (
              <span
                key={tag}
                className="rounded border border-muted/20 px-2 py-0.5 text-xs capitalize text-muted"
              >
                {tag}
              </span>
            ))}
          </div>

          <p className="text-sm text-muted">{item.description}</p>

          <div className="mt-auto flex items-center justify-between pt-2">
            <motion.span variants={priceVariants} className="text-sm font-medium text-foreground">
              {formatINR(item.price)}
            </motion.span>

            {!soldOut && (
              <motion.div layout transition={springs.snappy} className="flex items-center">
                {defaultQty === 0 ? (
                  <button
                    type="button"
                    onClick={() => {
                      flyImage();
                      add(item.id);
                    }}
                    className="rounded-card bg-accent px-4 py-1.5 text-xs text-surface transition-opacity hover:opacity-90"
                  >
                    Add
                  </button>
                ) : (
                  <div className="flex items-center gap-1 rounded-card border border-muted/30 bg-surface p-1">
                    <button
                      type="button"
                      aria-label={`One less ${item.name}`}
                      onClick={() => setQty(key, defaultQty - 1)}
                      className="p-1 text-foreground"
                    >
                      <Minus className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
                    </button>
                    <span className="min-w-6 text-center text-sm text-foreground">
                      {defaultQty}
                    </span>
                    <button
                      type="button"
                      aria-label={`One more ${item.name}`}
                      onClick={() => setQty(key, defaultQty + 1)}
                      className="p-1 text-foreground"
                    >
                      <Plus className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
                    </button>
                  </div>
                )}
              </motion.div>
            )}
          </div>
        </div>
      </motion.div>
    </motion.article>
  );
}
