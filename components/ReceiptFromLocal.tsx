"use client";

import Link from "next/link";
import { Printer } from "lucide-react";
import { useCart } from "@/lib/cart-store";
import type { ReceiptData } from "@/lib/receipt-schema";
import { ReceiptView } from "./ReceiptView";

/*
 * Client fallback for the receipt page: serverless databases are ephemeral,
 * so when the server has no record the receipt is rendered from the
 * snapshot saved on this device when the order was placed.
 */
export function ReceiptFromLocal({
  orderNumber,
  cafeName,
}: {
  orderNumber: string;
  cafeName: string;
}) {
  const receipt = useCart((s) => s.receipt);
  if (receipt && receipt.orderNumber === orderNumber) {
    return (
      <>
        <p className="mb-4 text-center text-xs text-muted">
          Restored from this device - the cafe&apos;s copy may have expired.
        </p>
        <ReceiptView receipt={receipt} cafeName={cafeName} />
      </>
    );
  }

  return (
    <div className="mx-auto w-full max-w-md rounded-card border border-muted/30 bg-surface p-6 text-center">
      <p className="text-foreground">No receipt found for {orderNumber} on this device.</p>
      <p className="mt-2 text-sm text-muted">
        Orders are stored for a short time on the demo deployment. Place a new order or ask at the
        counter with your order number.
      </p>
      <Link
        href="/"
        className="mt-4 inline-block rounded-card bg-accent px-5 py-2.5 text-sm text-surface"
      >
        Back to the menu
      </Link>
    </div>
  );
}

/** Print button - client-only because it touches window. */
export function ReceiptActions() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="mx-auto mt-4 flex items-center gap-2 rounded-card border border-muted/40 bg-surface px-5 py-2.5 text-sm text-foreground transition-colors hover:border-foreground"
    >
      <Printer className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
      Print receipt
    </button>
  );
}

export type { ReceiptData };
