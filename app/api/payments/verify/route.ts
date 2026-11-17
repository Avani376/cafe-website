import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getPaymentProvider } from "@/lib/payments/razorpay";
import { verifyRequestSchema } from "@/lib/order-schema";
import { markOrderPaid } from "@/lib/orders";
import { clientIpFromHeaders, rateLimit } from "@/lib/rate-limit";
import { sendNotification } from "@/lib/notify";
import { formatINR } from "@/lib/pricing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/*
 * POST /api/payments/verify (PRD Section 6.5). The Checkout handler calls
 * this with razorpay_order_id | razorpay_payment_id | razorpay_signature.
 * The server verifies the HMAC with the key secret, then marks the order
 * paid. Idempotent: verifying twice (or replaying) is a harmless no-op; the
 * webhook remains the source of truth if the user closes the tab early.
 */
export async function POST(request: Request) {
  const ip = clientIpFromHeaders(request.headers);
  if (!rateLimit(`verify:${ip}`, 30, 60 * 60 * 1000).ok) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  const body = await request.json().catch(() => null);
  const parsed = verifyRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const provider = getPaymentProvider();
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = parsed.data;

  if (
    !provider.verifyCheckoutSignature({
      razorpayOrderId: razorpay_order_id,
      razorpayPaymentId: razorpay_payment_id,
      signature: razorpay_signature,
    })
  ) {
    return NextResponse.json({ error: "invalid_signature" }, { status: 400 });
  }

  const marked = markOrderPaid(getDb(), {
    razorpayOrderId: razorpay_order_id,
    razorpayPaymentId: razorpay_payment_id,
    source: "checkout_verify",
  });

  if (!marked.ok) {
    const status =
      marked.error === "order_not_found" ? 404 : marked.error === "payment_used" ? 409 : 400;
    return NextResponse.json({ error: marked.error }, { status });
  }

  const order = marked.order;
  if (!marked.alreadyRecorded) {
    const items = JSON.parse(order.linesJson) as { name: string; qty: number }[];
    void sendNotification({
      subject: `New paid order ${order.orderNumber}`,
      lines: [
        `Order ${order.orderNumber} paid online`,
        ...items.map((item) => `- ${item.name} x${item.qty}`),
        `Total: ${formatINR(order.total)}`,
        order.pickupSlot ? `Pickup slot: ${order.pickupSlot}` : "Pickup: ASAP",
      ],
    });
  }

  return NextResponse.json({
    status: order.status,
    orderNumber: order.orderNumber,
    alreadyRecorded: marked.alreadyRecorded,
  });
}
