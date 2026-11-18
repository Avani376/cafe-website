"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

/*
 * Cart state (PRD Section 6.4). The store holds ids and quantities only -
 * never prices. Prices are resolved from the menu on render (display) and
 * recomputed on the server at order time (truth).
 *
 * Persisted in localStorage with a version key so a menu change cannot break
 * old carts; unknown item ids are dropped when the drawer renders.
 */

export interface CartLine {
  itemId: string;
  optionIds: string[];
  qty: number;
}

export function lineKey(line: Pick<CartLine, "itemId" | "optionIds">): string {
  return `${line.itemId}|${[...line.optionIds].sort().join(",")}`;
}

interface CartState {
  lines: CartLine[];
  /** Snapshot of the most recently placed order, for one-tap reorder (PRD Section 8.5). */
  lastOrder: CartLine[] | null;
  drawerOpen: boolean;
  add: (itemId: string, optionIds?: string[], qty?: number) => void;
  setQty: (key: string, qty: number) => void;
  removeLine: (key: string) => void;
  clear: () => void;
  saveLastOrder: (lines: CartLine[]) => void;
  reorderLastOrder: () => void;
  openDrawer: () => void;
  closeDrawer: () => void;
}

export const useCart = create<CartState>()(
  persist(
    (set) => ({
      lines: [],
      lastOrder: null,
      drawerOpen: false,
      add: (itemId, optionIds = [], qty = 1) =>
        set((state) => {
          const key = lineKey({ itemId, optionIds });
          const existing = state.lines.find((l) => lineKey(l) === key);
          if (existing) {
            return {
              lines: state.lines.map((l) =>
                lineKey(l) === key ? { ...l, qty: Math.min(l.qty + qty, 20) } : l,
              ),
            };
          }
          return { lines: [...state.lines, { itemId, optionIds, qty }] };
        }),
      setQty: (key, qty) =>
        set((state) => ({
          lines:
            qty <= 0
              ? state.lines.filter((l) => lineKey(l) !== key)
              : state.lines.map((l) => (lineKey(l) === key ? { ...l, qty: Math.min(qty, 20) } : l)),
        })),
      removeLine: (key) =>
        set((state) => ({ lines: state.lines.filter((l) => lineKey(l) !== key) })),
      clear: () => set({ lines: [] }),
      saveLastOrder: (lines) => set({ lastOrder: lines }),
      reorderLastOrder: () =>
        set((state) => {
          if (!state.lastOrder || state.lastOrder.length === 0) return {};
          return { lines: [...state.lastOrder], drawerOpen: true };
        }),
      openDrawer: () => set({ drawerOpen: true }),
      closeDrawer: () => set({ drawerOpen: false }),
    }),
    {
      name: "cafe-cart",
      version: 1,
      storage: createJSONStorage(() => localStorage),
      // Lines plus the last-order snapshot persist; drawerOpen always starts closed.
      partialize: (state) => ({ lines: state.lines, lastOrder: state.lastOrder }),
    },
  ),
);

/** Total item count for the header badge (0 until rehydration). */
export function useCartCount(): number {
  return useCart((s) => s.lines.reduce((sum, l) => sum + l.qty, 0));
}
