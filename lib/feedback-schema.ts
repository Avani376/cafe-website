import { z } from "zod";

/*
 * Shared feedback request shape (PRD Section 6.7) - used by the client form
 * and the API route so validation is identical on both sides. Minimum data
 * collection: only the message and rating are required. `website` is the
 * honeypot field: invisible to humans, and any value means spam.
 */
export const feedbackRequestSchema = z.object({
  name: z.string().trim().max(60).optional(),
  rating: z.number().int().min(1).max(5),
  orderedItem: z.string().trim().max(80).optional(),
  message: z.string().trim().min(3, "Tell us a little more").max(500),
  contact: z.string().trim().max(120).optional(),
  website: z.string().max(0, "Spam detected").optional(),
});

export type FeedbackRequest = z.infer<typeof feedbackRequestSchema>;
