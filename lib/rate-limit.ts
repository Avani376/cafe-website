/*
 * Minimal in-memory rate limiter (PRD Section 10: rate limiting on feedback
 * and order creation). Good enough for a single Node process; on Vercel
 * serverless instances are short-lived, so treat this as a first line only.
 * Swap for Upstash/Redis if abuse becomes a real concern.
 */

const hits = new Map<string, number[]>();

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): { ok: boolean; remaining: number } {
  const now = Date.now();
  const windowStart = now - windowMs;
  const previous = (hits.get(key) ?? []).filter((t) => t > windowStart);
  if (previous.length >= limit) {
    hits.set(key, previous);
    return { ok: false, remaining: 0 };
  }
  const next = [...previous, now];
  hits.set(key, next);
  // Opportunistic cleanup so the map does not grow forever.
  if (hits.size > 1000) {
    for (const [k, times] of hits) {
      if (times.every((t) => t <= windowStart)) hits.delete(k);
    }
  }
  return { ok: true, remaining: limit - next.length };
}

export function clientIpFromHeaders(headers: Headers): string {
  return (
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? headers.get("x-real-ip") ?? "unknown"
  );
}
