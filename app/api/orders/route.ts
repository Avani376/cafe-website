import { NextResponse } from "next/server";
import { getMenu, getSite } from "@/lib/content";
import { getDb } from "@/lib/db";
import { getPaymentProvider } from "@/lib/payments/razorpay";
import { PaymentProviderError } from "@/lib/payments";
import { orderRequestSchema } from "@/lib/order-schema";
import { createOrder, OrderError } from "@/lib/orders";
import { clientIpFromHeaders, rateLimit } from "@/lib/rate-limit";
import { sendNotification } from "@/lib/notify";
import { formatINR } from "@/lib/pricing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/*
 * POST /api/orders (PRD Section 6.5). The client sends item ids, option ids
 * and quantities only - never prices. The server recomputes the total from
 * content/menu.json, stores the order (pending for online, pay_at_counter
 * for counter orders) and returns the order data for Checkout.
 */
export async function POST(request: Request) {
  const ip = clientIpFromHeaders(request.headers);
  if (!rateLimit(`orders:${ip}`, 10, 60 * 60 * 1000).ok) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  const body = await request.json().catch(() => null);
  const parsed = orderRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  try {
    const provider = getPaymentProvider();
    const { order, kind, publicKeyId } = await createOrder(
      getDb(),
      getMenu(),
      getSite(),
      provider,
      parsed.data,
    );
    const items = JSON.parse(order.linesJson) as {
      name: string;
      qty: number;
      lineTotal: number;
      options: { label: string }[];
    }[];

    if (kind === "pay_at_counter") {
      // Counter orders never touch the payment flow; notify immediately.
      void sendNotification({
        subject: `New counter order ${order.orderNumber}`,
        lines: [
          `Order ${order.orderNumber} (${order.orderType === "pickup" ? "pickup" : "dine-in"})`,
          ...items.map(
            (item) =>
              `- ${item.name} x${item.qty}${item.options.length > 0 ? ` (${item.options.map((o) => o.label).join(", ")})` : ""} = ${formatINR(item.lineTotal)}`,
          ),
          `Total: ${formatINR(order.total)}`,
          order.pickupSlot ? `Pickup slot: ${order.pickupSlot}` : "Pickup: ASAP",
          order.note ? `Note: ${order.note}` : "",
        ].filter(Boolean),
      });
    }

    return NextResponse.json({
      orderId: order.id,
      orderNumber: order.orderNumber,
      payMethod: kind,
      amount: order.total,
      currency: "INR",
      razorpayOrderId: order.razorpayOrderId,
      publicKeyId,
      pickupSlot: order.pickupSlot,
      items,
    });
  } catch (error) {
    if (error instanceof OrderError) {
      return NextResponse.json({ error: error.code }, { status: 400 });
    }
    if (error instanceof PaymentProviderError) {
      console.error("[orders] payment provider failed:", error.message);
      return NextResponse.json({ error: "payment_provider_failed" }, { status: 502 });
    }
    console.error("[orders] unexpected error:", error);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
