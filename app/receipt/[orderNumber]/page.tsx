import Link from "next/link";
import type { Metadata } from "next";
import { getDb } from "@/lib/db";
import { getOrderByNumber } from "@/lib/orders";
import { getSite } from "@/lib/content";
import { ReceiptView } from "@/components/ReceiptView";
import { ReceiptFromLocal, ReceiptActions } from "@/components/ReceiptFromLocal";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function paymentLabelFor(status: string): string {
  if (status === "paid") return "Paid online";
  if (status === "pay_at_counter") return "Pay at counter";
  return "Payment pending";
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ orderNumber: string }>;
}): Promise<Metadata> {
  const { orderNumber } = await params;
  return {
    title: `Receipt ${orderNumber.toUpperCase()} - Ember & Ink`,
    robots: { index: false, follow: false },
  };
}

/*
 * Printable order receipt (dine-in confirmation and pickup proof). The
 * server looks the order up in the database; if the ephemeral serverless
 * database no longer has it, the client falls back to the snapshot saved on
 * the visitor's device when the order was placed.
 */
export default async function ReceiptPage({
  params,
}: {
  params: Promise<{ orderNumber: string }>;
}) {
  const { orderNumber } = await params;
  const normalized = orderNumber.toUpperCase();
  const site = getSite();
  const order = getOrderByNumber(getDb(), normalized);

  return (
    <main className="min-h-dvh px-4 py-12">
      <div className="mx-auto w-full max-w-xl">
        <Link
          href="/"
          className="text-sm text-muted underline underline-offset-2 hover:text-foreground"
        >
          Back to {site.name}
        </Link>

        <div className="mt-6">
          {order ? (
            <ReceiptView
              receipt={{
                orderNumber: order.orderNumber,
                status: order.status,
                orderType: order.orderType,
                tableNumber: order.tableNumber,
                pickupSlot: order.pickupSlot,
                items: JSON.parse(order.linesJson),
                total: order.total,
                createdAt: order.createdAt,
                paymentLabel: paymentLabelFor(order.status),
              }}
              cafeName={site.name}
            />
          ) : (
            <ReceiptFromLocal orderNumber={normalized} cafeName={site.name} />
          )}
          <ReceiptActions />
        </div>
      </div>
    </main>
  );
}
