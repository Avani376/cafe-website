import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
// Provider reads secrets lazily, so the dummy test secrets below (clearly not
// real credentials) are set before any verification call.
process.env.RAZORPAY_KEY_ID = "test_key_id";
process.env.RAZORPAY_KEY_SECRET = "test_key_secret_dummy";
process.env.RAZORPAY_WEBHOOK_SECRET = "test_webhook_secret_dummy";

import { RazorpayProvider } from "@/lib/payments/razorpay";

describe("checkout signature verification", () => {
  const provider = new RazorpayProvider();
  const orderId = "order_test123";
  const paymentId = "pay_test456";

  const sign = (secret: string, payload: string) =>
    createHmac("sha256", secret).update(payload).digest("hex");

  it("accepts a valid HMAC of razorpay_order_id|razorpay_payment_id", () => {
    const signature = sign("test_key_secret_dummy", `${orderId}|${paymentId}`);
    expect(
      provider.verifyCheckoutSignature({
        razorpayOrderId: orderId,
        razorpayPaymentId: paymentId,
        signature,
      }),
    ).toBe(true);
  });

  it("rejects a signature computed with the wrong secret", () => {
    const signature = sign("attacker_secret", `${orderId}|${paymentId}`);
    expect(
      provider.verifyCheckoutSignature({
        razorpayOrderId: orderId,
        razorpayPaymentId: paymentId,
        signature,
      }),
    ).toBe(false);
  });

  it("rejects a tampered payment id", () => {
    const signature = sign("test_key_secret_dummy", `${orderId}|${paymentId}`);
    expect(
      provider.verifyCheckoutSignature({
        razorpayOrderId: orderId,
        razorpayPaymentId: "pay_attacker",
        signature,
      }),
    ).toBe(false);
  });

  it("rejects a tampered order id", () => {
    const signature = sign("test_key_secret_dummy", `${orderId}|${paymentId}`);
    expect(
      provider.verifyCheckoutSignature({
        razorpayOrderId: "order_other",
        razorpayPaymentId: paymentId,
        signature,
      }),
    ).toBe(false);
  });

  it("rejects malformed signatures without throwing", () => {
    expect(
      provider.verifyCheckoutSignature({
        razorpayOrderId: orderId,
        razorpayPaymentId: paymentId,
        signature: "not-hex",
      }),
    ).toBe(false);
    expect(
      provider.verifyCheckoutSignature({
        razorpayOrderId: orderId,
        razorpayPaymentId: paymentId,
        signature: "",
      }),
    ).toBe(false);
  });
});

describe("webhook signature verification", () => {
  const provider = new RazorpayProvider();

  const rawBody = JSON.stringify({
    event: "payment.captured",
    payload: {
      payment: {
        entity: {
          id: "pay_webhook1",
          order_id: "order_test123",
          amount: 18000,
          status: "captured",
        },
      },
    },
  });
  const sign = (secret: string, payload: string) =>
    createHmac("sha256", secret).update(payload, "utf8").digest("hex");

  it("accepts a valid HMAC over the raw request body", () => {
    expect(
      provider.verifyWebhookSignature({
        rawBody,
        signature: sign("test_webhook_secret_dummy", rawBody),
      }),
    ).toBe(true);
  });

  it("rejects a flipped byte in the body", () => {
    const tampered = rawBody.replace("18000", "99999");
    expect(
      provider.verifyWebhookSignature({
        rawBody: tampered,
        signature: sign("test_webhook_secret_dummy", rawBody),
      }),
    ).toBe(false);
  });

  it("rejects a signature from the wrong secret", () => {
    expect(provider.verifyWebhookSignature({ rawBody, signature: sign("wrong", rawBody) })).toBe(
      false,
    );
  });

  it("rejects when the webhook secret is not configured", () => {
    const saved = process.env.RAZORPAY_WEBHOOK_SECRET;
    delete process.env.RAZORPAY_WEBHOOK_SECRET;
    try {
      expect(
        provider.verifyWebhookSignature({
          rawBody,
          signature: sign("test_webhook_secret_dummy", rawBody),
        }),
      ).toBe(false);
    } finally {
      process.env.RAZORPAY_WEBHOOK_SECRET = saved;
    }
  });
});
