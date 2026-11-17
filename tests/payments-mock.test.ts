import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { createDb } from "@/lib/db";
import { createOrder, markOrderPaid } from "@/lib/orders";
import { orderRequestSchema } from "@/lib/order-schema";
import { toPaise } from "@/lib/pricing";
import { MockProvider, mockCapturePayload } from "@/lib/payments/mock";
import type { MenuItem, Site } from "@/lib/content";
import type { PaymentProvider } from "@/lib/payments";

// Sandbox mode on for the pipeline test; the flag is clearly a dev switch,
// not a credential.
process.env.PAYMENT_MOCK = "true";

const item: MenuItem = {
  id: "flat-white",
  name: "Flat White",
  category: "coffee",
  description: "Double ristretto, steamed milk.",
  price: 180,
  image: "/menu/flat-white.jpg",
  diet: ["veg"],
  tags: [],
  available: true,
  options: [],
};

const menu = { items: [item] };

const site: Site = {
  name: "Ember & Ink",
  tagline: "Speciality coffee house",
  address: "Sample",
  phone: "+91-00000-00000",
  mapUrl: "https://maps.google.com",
  timezone: "Asia/Kolkata",
  hours: {
    mon: [["08:00", "22:00"]],
    tue: [["08:00", "22:00"]],
    wed: [["08:00", "22:00"]],
    thu: [["08:00", "22:00"]],
    fri: [["08:00", "22:00"]],
    sat: [["08:00", "22:00"]],
    sun: [["08:00", "22:00"]],
  },
  links: { cafe: [], owner: [] },
};

describe("MockProvider (sandbox)", () => {
  it("is configured only when PAYMENT_MOCK=true", () => {
    const provider = new MockProvider();
    const saved = process.env.PAYMENT_MOCK;
    try {
      delete process.env.PAYMENT_MOCK;
      expect(provider.isConfigured()).toBe(false);
      process.env.PAYMENT_MOCK = "true";
      expect(provider.isConfigured()).toBe(true);
    } finally {
      if (saved === undefined) delete process.env.PAYMENT_MOCK;
      else process.env.PAYMENT_MOCK = saved;
    }
  });

  it("creates uniquely-named sandbox orders and rejects bad amounts", async () => {
    const provider = new MockProvider();
    const first = await provider.createRemoteOrder({ amountPaise: 18000, receipt: "K-0001" });
    const second = await provider.createRemoteOrder({ amountPaise: 18000, receipt: "K-0002" });
    expect(first.providerOrderId).toMatch(/^mock_order_[0-9a-f]+$/);
    expect(second.providerOrderId).not.toBe(first.providerOrderId);
    await expect(
      provider.createRemoteOrder({ amountPaise: 0, receipt: "K-0003" }),
    ).rejects.toThrow();
  });

  it("signs captures that pass its own verification, and rejects tampering", async () => {
    const provider = new MockProvider();
    const payload = mockCapturePayload("mock_order_abc");
    expect(
      provider.verifyCheckoutSignature({ ...payload, signature: payload.razorpaySignature }),
    ).toBe(true);
    expect(
      provider.verifyCheckoutSignature({
        razorpayOrderId: payload.razorpayOrderId,
        razorpayPaymentId: "mock_pay_tampered",
        signature: payload.razorpaySignature,
      }),
    ).toBe(false);
    expect(
      provider.verifyCheckoutSignature({
        razorpayOrderId: payload.razorpayOrderId,
        razorpayPaymentId: payload.razorpayPaymentId,
        signature: "deadbeef",
      }),
    ).toBe(false);
    // The signature must be a real HMAC over order|payment.
    const expected = createHmac("sha256", "ember-sandbox-no-real-money")
      .update(`${payload.razorpayOrderId}|${payload.razorpayPaymentId}`)
      .digest("hex");
    expect(payload.razorpaySignature).toBe(expected);
  });

  it("marks a sandbox order paid through the regular idempotent pipeline", async () => {
    const db = createDb(":memory:");
    const provider: PaymentProvider = new MockProvider();
    const payload = orderRequestSchema.parse({
      items: [{ itemId: "flat-white", qty: 1 }],
      orderType: "pickup",
      payMethod: "online",
    });
    const { order } = await createOrder(db, menu, site, provider, payload);
    expect(order.razorpayOrderId).toMatch(/^mock_order_/);

    const capture = mockCapturePayload(order.razorpayOrderId as string);
    expect(
      provider.verifyCheckoutSignature({ ...capture, signature: capture.razorpaySignature }),
    ).toBe(true);

    const marked = markOrderPaid(db, {
      razorpayOrderId: order.razorpayOrderId ?? undefined,
      razorpayPaymentId: capture.razorpayPaymentId,
      source: "checkout_verify",
    });
    expect(marked.ok).toBe(true);
    if (marked.ok) expect(marked.order.status).toBe("paid");

    // Replaying the same capture is harmless.
    const again = markOrderPaid(db, {
      razorpayOrderId: order.razorpayOrderId ?? undefined,
      razorpayPaymentId: capture.razorpayPaymentId,
      source: "checkout_verify",
    });
    expect(again.ok).toBe(true);
    if (again.ok) expect(again.alreadyRecorded).toBe(true);
    expect(toPaise(order.total)).toBe(18000);
  });
});
