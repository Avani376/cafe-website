"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Minus, Plus, X } from "lucide-react";
import { useCart } from "@/lib/cart-store";
import { springs } from "@/lib/motion";
import { computeCart, formatINR } from "@/lib/pricing";
import type { MenuItem } from "@/lib/content";
import { DietMark } from "./DietMark";
import { useDialogBehavior } from "./dialog-behavior";

interface ItemDetailSheetProps {
  item: MenuItem | null;
  hasImage: boolean;
  onClose: () => void;
}

/*
 * Item detail sheet (PRD Section 6.3): larger image, options, quantity and
 * "Add to order". The card image expands into the sheet through a shared
 * layout id (PRD Section 7). Escape closes, focus is trapped, and reduced
 * motion replaces movement with a plain fade.
 */
export function ItemDetailSheet({ item, hasImage, onClose }: ItemDetailSheetProps) {
  const add = useCart((s) => s.add);
  const reduce = useReducedMotion();
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [optionIds, setOptionIds] = useState<string[]>([]);
  const [qty, setQtyState] = useState(1);

  useDialogBehavior(panelRef, item !== null, onClose);

  const displayTotal = item
    ? computeCart({ items: [item] }, [{ itemId: item.id, optionIds, qty }]).total
    : 0;

  return (
    <AnimatePresence>
      {item && (
        <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center">
          <motion.button
            type="button"
            aria-label="Close item details"
            onClick={onClose}
            className="absolute inset-0 bg-foreground/40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          />

          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="item-detail-title"
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 48 }}
            animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: 48 }}
            transition={springs.soft}
            className="relative z-10 max-h-88dvh w-full overflow-y-auto rounded-t-2xl border border-muted/20 bg-surface md:max-w-lg md:rounded-card"
          >
            <motion.div
              layoutId={reduce ? undefined : `item-image-${item.id}`}
              transition={springs.soft}
              className="relative aspect-16/9 overflow-hidden rounded-t-2xl bg-accent/5 md:rounded-t-card"
            >
              {hasImage ? (
                <Image
                  src={item.image}
                  alt={`${item.name} - ${item.description}`}
                  fill
                  sizes="(min-width: 768px) 512px, 100vw"
                  className="object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <span className="font-display text-2xl text-muted/80">{item.name}</span>
                </div>
              )}
            </motion.div>

            <div className="p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-2">
                  {item.diet[0] && <DietMark diet={item.diet[0]} />}
                  <h3 id="item-detail-title" className="font-display text-2xl text-foreground">
                    {item.name}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close"
                  className="rounded-card border border-muted/30 p-2 text-foreground"
                >
                  <X className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
                </button>
              </div>

              <p className="mt-2 text-sm text-muted">{item.description}</p>

              {item.options.length > 0 && (
                <fieldset className="mt-6">
                  <legend className="text-sm text-foreground">Options</legend>
                  <div className="mt-2 flex flex-col gap-2">
                    {item.options.map((option) => {
                      const checked = optionIds.includes(option.id);
                      return (
                        <label
                          key={option.id}
                          className={`flex cursor-pointer items-center justify-between rounded-card border px-3 py-2 text-sm ${
                            checked ? "border-foreground bg-surface" : "border-muted/30"
                          }`}
                        >
                          <span className="flex items-center gap-2 text-foreground">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() =>
                                setOptionIds((prev) =>
                                  checked
                                    ? prev.filter((id) => id !== option.id)
                                    : [...prev, option.id],
                                )
                              }
                              className="accent-accent"
                            />
                            {option.label}
                          </span>
                          <span className="text-muted">{formatINR(option.price)}</span>
                        </label>
                      );
                    })}
                  </div>
                </fieldset>
              )}

              <div className="mt-6 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    aria-label="One less"
                    onClick={() => setQtyState((q) => Math.max(1, q - 1))}
                    className="rounded-card border border-muted/30 p-2 text-foreground"
                  >
                    <Minus className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
                  </button>
                  <span aria-live="polite" className="min-w-8 text-center text-sm text-foreground">
                    {qty}
                  </span>
                  <button
                    type="button"
                    aria-label="One more"
                    onClick={() => setQtyState((q) => Math.min(20, q + 1))}
                    className="rounded-card border border-muted/30 p-2 text-foreground"
                  >
                    <Plus className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    add(item.id, optionIds, qty);
                    onClose();
                  }}
                  className="rounded-card bg-accent px-6 py-3 text-sm text-surface transition-opacity hover:opacity-90"
                >
                  Add to order - {formatINR(displayTotal)}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
