import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { getPaymentProvider } from "@/lib/payments/razorpay";
import { mockCapturePayload } from "@/lib/payments/mock";
import { markOrderPaid } from "@/lib/orders";
import { clientIpFromHeaders, rateLimit } from "@/lib/rate-limit";
import { sendNotification } from "@/lib/notify";
import { formatINR } from "@/lib/pricing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/*
 * POST /api/payments/mock-capture - sandbox only (PAYMENT_MOCK=true).
 * Simulates what Razorpay's hosted Checkout does: captures a payment for a
 * pending sandbox order and returns the handler payload. The capture is
 * then verified with the provider's own signature check and marked paid
 * through the regular markOrderPaid pipeline, so idempotency rules hold.
 * Returns 403 when the app is NOT running the sandbox provider.
 */
const captureSchema = z.object({ razorpayOrderId: z.string().min(1).max(100) });

export async function POST(request: Request) {
  const ip = clientIpFromHeaders(request.headers);
  if (!rateLimit(`mock-capture:${ip}`, 30, 60 * 60 * 1000).ok) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  const provider = getPaymentProvider();
  if (provider.name !== "mock") {
    return NextResponse.json({ error: "mock_disabled" }, { status: 403 });
  }

  const parsed = captureSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const payload = mockCapturePayload(parsed.data.razorpayOrderId);
  if (
    !provider.verifyCheckoutSignature({
      razorpayOrderId: payload.razorpayOrderId,
      razorpayPaymentId: payload.razorpayPaymentId,
      signature: payload.razorpaySignature,
    })
  ) {
    return NextResponse.json({ error: "invalid_signature" }, { status: 400 });
  }

  const marked = markOrderPaid(getDb(), {
    razorpayOrderId: payload.razorpayOrderId,
    razorpayPaymentId: payload.razorpayPaymentId,
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
      subject: `New paid order ${order.orderNumber} (sandbox)`,
      lines: [
        `Order ${order.orderNumber} paid via sandbox capture`,
        ...items.map((item) => `- ${item.name} x${item.qty}`),
        `Total: ${formatINR(order.total)}`,
        "This was a simulated payment - no real money moved.",
      ],
    });
  }

  return NextResponse.json({
    status: order.status,
    orderNumber: order.orderNumber,
    alreadyRecorded: marked.alreadyRecorded,
  });
}
