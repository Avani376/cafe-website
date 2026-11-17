"use client";

import { useCart } from "@/lib/cart-store";

/** Client button that opens the cart drawer (hero secondary action). */
export function OpenCartButton({ label, className }: { label: string; className?: string }) {
  const openDrawer = useCart((s) => s.openDrawer);
  return (
    <button type="button" onClick={() => openDrawer()} className={className}>
      {label}
    </button>
  );
}
