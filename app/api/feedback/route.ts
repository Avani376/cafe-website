import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { feedbackRequestSchema } from "@/lib/feedback-schema";
import { saveFeedback } from "@/lib/feedback";
import { clientIpFromHeaders, rateLimit } from "@/lib/rate-limit";
import { sendNotification } from "@/lib/notify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/*
 * POST /api/feedback (PRD Section 6.7).
 * - Validation with the shared Zod schema (client uses the same one).
 * - Spam protection: honeypot field (silently dropped, success-shaped reply
 *   so bots learn nothing) plus a 5-per-hour IP rate limit.
 * - Saved to the feedback table and emailed to the cafe when Resend is
 *   configured.
 */
export async function POST(request: Request) {
  const ip = clientIpFromHeaders(request.headers);
  if (!rateLimit(`feedback:${ip}`, 5, 60 * 60 * 1000).ok) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  const body = await request.json().catch(() => null);
  const parsed = feedbackRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  if (parsed.data.website) {
    // Honeypot filled: almost certainly a bot. Pretend success, store nothing.
    return NextResponse.json({ ok: true });
  }

  const row = saveFeedback(getDb(), parsed.data);

  void sendNotification({
    subject: `New feedback (${parsed.data.rating}/5)`,
    lines: [
      `Rating: ${parsed.data.rating}/5`,
      parsed.data.name ? `From: ${parsed.data.name}` : "From: anonymous",
      parsed.data.orderedItem ? `Ordered: ${parsed.data.orderedItem}` : "",
      `Message: ${parsed.data.message}`,
      parsed.data.contact ? `Contact: ${parsed.data.contact}` : "",
    ].filter(Boolean),
  });

  return NextResponse.json({ ok: true, id: row.id });
}
