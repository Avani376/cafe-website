"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Printer } from "lucide-react";
import { useCart } from "@/lib/cart-store";
import type { ReceiptData } from "@/lib/receipt-schema";
import { ReceiptView } from "./ReceiptView";

/*
 * Client fallback for the receipt page: serverless databases are ephemeral,
 * so when the server has no record the receipt is rendered from (1) the
 * snapshot saved on this device when the order was placed, or (2) one last
 * fetch of the order API - which may land on the instance that holds it.
 */
export function ReceiptFromLocal({
  orderNumber,
  cafeName,
}: {
  orderNumber: string;
  cafeName: string;
}) {
  const receipt = useCart((s) => s.receipt);
  const [fetched, setFetched] = useState<ReceiptData | null>(null);
  const [checked, setChecked] = useState(false);

  // Second fallback: ask the API once (it may run on the instance that
  // still holds this order).
  useEffect(() => {
    let cancelled = false;
    async function tryFetch() {
      try {
        const res = await fetch(`/api/orders/${encodeURIComponent(orderNumber)}`);
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as {
          orderNumber: string;
          status: string;
          orderType: string;
          tableNumber: string | null;
          pickupSlot: string | null;
          items: { name: string; qty: number; lineTotal: number }[];
          total: number;
          createdAt: number;
          paymentLabel: string;
        };
        if (!cancelled) {
          setFetched({
            orderNumber: data.orderNumber,
            status: data.status,
            orderType: data.orderType,
            tableNumber: data.tableNumber,
            pickupSlot: data.pickupSlot,
            items: data.items,
            total: data.total,
            createdAt: data.createdAt,
            paymentLabel: data.paymentLabel,
          });
        }
      } catch {
        // Network hiccup - stay on the not-found state.
      } finally {
        if (!cancelled) setChecked(true);
      }
    }
    tryFetch();
    return () => {
      cancelled = true;
    };
  }, [orderNumber]);

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

  if (fetched) {
    return <ReceiptView receipt={fetched} cafeName={cafeName} />;
  }

  return (
    <div className="mx-auto w-full max-w-md rounded-card border border-muted/30 bg-surface p-6 text-center">
      <p className="text-foreground">No receipt found for {orderNumber} on this device.</p>
      <p className="mt-2 text-sm text-muted">
        {checked
          ? "Orders are stored for a short time on the demo deployment. Place a new order or ask at the counter with your order number."
          : "Looking for your order..."}
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
