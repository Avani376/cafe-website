import { randomUUID } from "node:crypto";
import type { CafeDatabase, FeedbackRow } from "./db";
import type { FeedbackRequest } from "./feedback-schema";

/*
 * Feedback storage (PRD Section 6.7). Inserts a validated submission into
 * the feedback table; the API route handles validation, the honeypot,
 * rate limiting and the email notification.
 */
export function saveFeedback(db: CafeDatabase, feedback: FeedbackRequest): FeedbackRow {
  const id = randomUUID();
  const now = Date.now();
  db.$client
    .prepare(
      `INSERT INTO feedback (id, name, rating, ordered_item, message, contact, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      id,
      feedback.name ?? null,
      feedback.rating,
      feedback.orderedItem ?? null,
      feedback.message,
      feedback.contact ?? null,
      now,
    );

  // Return the camelCase shape directly - raw rows come back in snake_case.
  return {
    id,
    name: feedback.name ?? null,
    rating: feedback.rating,
    orderedItem: feedback.orderedItem ?? null,
    message: feedback.message,
    contact: feedback.contact ?? null,
    createdAt: now,
  };
}
