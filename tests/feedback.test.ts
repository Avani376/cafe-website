import { describe, expect, it } from "vitest";
import { feedbackRequestSchema } from "@/lib/feedback-schema";
import { createDb } from "@/lib/db";
import { saveFeedback } from "@/lib/feedback";

const valid = {
  rating: 5,
  message: "Best flat white in the neighbourhood.",
};

describe("feedbackRequestSchema (shared client/server validation)", () => {
  it("accepts a minimal valid submission (rating + message only)", () => {
    const parsed = feedbackRequestSchema.safeParse(valid);
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.message).toBe("Best flat white in the neighbourhood.");
  });

  it("accepts all optional fields when present", () => {
    const parsed = feedbackRequestSchema.safeParse({
      ...valid,
      name: "Aisha",
      orderedItem: "Flat White",
      contact: "aisha@example.com",
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.name).toBe("Aisha");
  });

  it("rejects a missing or too-short message", () => {
    expect(feedbackRequestSchema.safeParse({ rating: 5, message: "" }).success).toBe(false);
    expect(feedbackRequestSchema.safeParse({ rating: 5, message: "hi" }).success).toBe(false);
    expect(feedbackRequestSchema.safeParse({ rating: 5 }).success).toBe(false);
  });

  it("rejects ratings outside 1-5 or non-integer", () => {
    expect(feedbackRequestSchema.safeParse({ ...valid, rating: 0 }).success).toBe(false);
    expect(feedbackRequestSchema.safeParse({ ...valid, rating: 6 }).success).toBe(false);
    expect(feedbackRequestSchema.safeParse({ ...valid, rating: 4.5 }).success).toBe(false);
  });

  it("rejects over-long fields", () => {
    expect(feedbackRequestSchema.safeParse({ ...valid, message: "x".repeat(501) }).success).toBe(
      false,
    );
    expect(feedbackRequestSchema.safeParse({ ...valid, name: "x".repeat(61) }).success).toBe(false);
    expect(feedbackRequestSchema.safeParse({ ...valid, contact: "x".repeat(121) }).success).toBe(
      false,
    );
  });

  it("rejects a filled honeypot field - that is spam", () => {
    expect(
      feedbackRequestSchema.safeParse({ ...valid, website: "http://spam.example" }).success,
    ).toBe(false);
  });

  it("trims before checking the minimum, so whitespace-only padding fails", () => {
    expect(feedbackRequestSchema.safeParse({ rating: 5, message: "  good  " }).success).toBe(true);
    expect(feedbackRequestSchema.safeParse({ rating: 5, message: "      " }).success).toBe(false);
    // "  ok  " trims to 2 characters - below the 3-character minimum.
    expect(feedbackRequestSchema.safeParse({ rating: 5, message: "  ok  " }).success).toBe(false);
  });
});

describe("saveFeedback", () => {
  it("stores a validated submission with only the chosen optional data", () => {
    const db = createDb(":memory:");
    const row = saveFeedback(db, feedbackRequestSchema.parse({ ...valid, name: "Aisha" }));
    expect(row.rating).toBe(5);
    expect(row.name).toBe("Aisha");
    expect(row.contact).toBeNull();
    expect(row.createdAt).toBeGreaterThan(0);
  });
});
