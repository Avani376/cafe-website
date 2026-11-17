import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getPaymentProvider } from "@/lib/payments/razorpay";
import { processWebhookEvent } from "@/lib/orders";
import { sendNotification } from "@/lib/notify";
import { formatINR } from "@/lib/pricing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/*
 * POST /api/webhooks/razorpay (PRD Section 6.5). Verifies the webhook
 * signature against the RAW request body and is the source of truth for
 * paid status (covers the closed-tab case). Idempotent: replayed events are
 * detected by the event log and answered with 200 so Razorpay stops
 * retrying; double verification cannot mark an order paid twice.
 */
export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-razorpay-signature") ?? "";
  const eventId = request.headers.get("x-razorpay-event-id") ?? undefined;

  const result = processWebhookEvent(getDb(), getPaymentProvider(), rawBody, signature, eventId);

  if (!result.ok) {
    const status = result.error === "bad_signature" || result.error === "bad_payload" ? 400 : 500;
    return NextResponse.json({ error: result.error }, { status });
  }

  const paidOrder = (
    result as { paidOrder?: { orderNumber: string; total: number; linesJson: string } | undefined }
  ).paidOrder;
  if (paidOrder && !result.replay) {
    const items = JSON.parse(paidOrder.linesJson) as { name: string; qty: number }[];
    void sendNotification({
      subject: `New paid order ${paidOrder.orderNumber} (webhook)`,
      lines: [
        `Order ${paidOrder.orderNumber} confirmed paid by webhook`,
        ...items.map((item) => `- ${item.name} x${item.qty}`),
        `Total: ${formatINR(paidOrder.total)}`,
      ],
    });
  }

  return NextResponse.json({ ok: true, replay: result.replay ?? false });
}
