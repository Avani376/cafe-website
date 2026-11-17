/*
 * Order and feedback notifications via the Resend REST API (PRD Section 6.5).
 * Uses fetch directly - no SDK dependency. Fire-and-forget: notification
 * failures must never block or fail the order itself.
 * No-op when RESEND_API_KEY or NOTIFY_EMAIL is missing (dev, tests).
 */

export interface NotifyPayload {
  subject: string;
  lines: string[];
}

export async function sendNotification(payload: NotifyPayload): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.NOTIFY_EMAIL;
  const from = process.env.FROM_EMAIL ?? "Cafe Orders <onboarding@resend.dev>";
  if (!apiKey || !to) {
    console.info("[notify] skipped: RESEND_API_KEY or NOTIFY_EMAIL not set");
    return false;
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [to],
        subject: payload.subject,
        text: payload.lines.join("\n"),
      }),
    });
    if (!res.ok) {
      console.error("[notify] Resend API error:", res.status, await res.text());
      return false;
    }
    return true;
  } catch (error) {
    console.error("[notify] send failed:", error);
    return false;
  }
}
