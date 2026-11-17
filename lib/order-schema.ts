import { z } from "zod";

/*
 * Shared request shape for POST /api/orders. Deliberately contains NO price
 * fields: the server recomputes everything from menu.json (working rule 5).
 * Anything a tampered client adds to the payload is ignored by zod.
 */

export const orderRequestSchema = z
  .object({
    items: z
      .array(
        z.object({
          itemId: z.string().min(1).max(64),
          optionIds: z.array(z.string().min(1).max(64)).max(8).default([]),
          qty: z.number().int().min(1).max(20),
        }),
      )
      .min(1)
      .max(30),
    orderType: z.enum(["pickup", "dine_in"]),
    tableNumber: z.string().trim().max(10).optional(),
    note: z.string().trim().max(200).optional(),
    pickupSlot: z
      .string()
      .regex(/^([01]\d|2[0-3]):[0-5]\d$/)
      .optional(),
    payMethod: z.enum(["online", "pay_at_counter"]),
  })
  .refine((data) => data.orderType !== "dine_in" || Boolean(data.tableNumber), {
    message: "Dine-in orders need a table number",
    path: ["tableNumber"],
  });

export type OrderRequest = z.infer<typeof orderRequestSchema>;

export const verifyRequestSchema = z.object({
  razorpay_order_id: z.string().min(1),
  razorpay_payment_id: z.string().min(1),
  razorpay_signature: z.string().min(1),
});

export type VerifyRequest = z.infer<typeof verifyRequestSchema>;
