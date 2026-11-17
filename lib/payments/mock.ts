import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { PaymentProviderError, type PaymentProvider, type RemoteOrderResult } from "./index";

/*
 * Sandbox provider, enabled only when PAYMENT_MOCK=true. It simulates the
 * Razorpay checkout flow with no real money: order creation, capture and
 * signature verification run through the same PaymentProvider interface and
 * the same idempotent order state machine (lib/orders.ts) as the real
 * provider, so the whole payment UX is testable before the owner's Razorpay
 * account exists. Never enable in production - the "secret" below is a
 * labelled development constant, not a credential.
 */

const SECRET = process.env.PAYMENT_MOCK_SECRET ?? "ember-sandbox-no-real-money";

export class MockProvider implements PaymentProvider {
  readonly name = "mock";

  isConfigured(): boolean {
    return process.env.PAYMENT_MOCK === "true";
  }

  getPublicKeyId(): string | null {
    return "sandbox";
  }

  async createRemoteOrder(params: {
    amountPaise: number;
    receipt: string;
    notes?: Record<string, string>;
  }): Promise<RemoteOrderResult> {
    if (!Number.isInteger(params.amountPaise) || params.amountPaise <= 0) {
      throw new PaymentProviderError(`Invalid amount: ${params.amountPaise}`);
    }
    return { providerOrderId: `mock_order_${randomBytes(8).toString("hex")}` };
  }

  verifyCheckoutSignature(params: {
    razorpayOrderId: string;
    razorpayPaymentId: string;
    signature: string;
  }): boolean {
    const expected = createHmac("sha256", SECRET)
      .update(`${params.razorpayOrderId}|${params.razorpayPaymentId}`)
      .digest("hex");
    return safeEqualHex(expected, params.signature);
  }

  verifyWebhookSignature(params: { rawBody: string; signature: string }): boolean {
    const expected = createHmac("sha256", SECRET).update(params.rawBody, "utf8").digest("hex");
    return safeEqualHex(expected, params.signature);
  }
}

export function safeEqualHex(expectedHex: string, provided: string): boolean {
  const a = Buffer.from(expectedHex, "utf8");
  const b = Buffer.from(provided, "utf8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/**
 * Server-side sandbox capture: builds the payload a real Checkout handler
 * would return to the client (order id, payment id, HMAC signature). The
 * capture endpoint feeds this through the regular verification and
 * markOrderPaid pipeline - nothing bypasses the idempotency rules.
 */
export function mockCapturePayload(razorpayOrderId: string): {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
} {
  const razorpayPaymentId = `mock_pay_${randomBytes(8).toString("hex")}`;
  const razorpaySignature = createHmac("sha256", SECRET)
    .update(`${razorpayOrderId}|${razorpayPaymentId}`)
    .digest("hex");
  return { razorpayOrderId, razorpayPaymentId, razorpaySignature };
}
