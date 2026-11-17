import { createHmac } from "node:crypto";
import { PaymentProviderError, type PaymentProvider, type RemoteOrderResult } from "./index";
import { MockProvider, safeEqualHex } from "./mock";

/*
 * Razorpay implementation of the PaymentProvider interface (test mode during
 * development, PRD Section 6.5). Uses the REST API directly with fetch - no
 * SDK dependency. Secrets come from environment variables only, read lazily
 * so tests can inject dummy values via env without any credentials in code.
 *
 * - Checkout signature: HMAC_SHA256(razorpay_order_id|razorpay_payment_id, KEY_SECRET)
 * - Webhook signature:  HMAC_SHA256(raw_request_body, WEBHOOK_SECRET)
 */

const API_BASE = "https://api.razorpay.com/v1";

function readEnv(name: string): string | undefined {
  const value = process.env[name];
  return value && value.length > 0 ? value : undefined;
}

export class RazorpayProvider implements PaymentProvider {
  readonly name = "razorpay";

  private keyId(): string | undefined {
    return readEnv("RAZORPAY_KEY_ID");
  }

  private keySecret(): string | undefined {
    return readEnv("RAZORPAY_KEY_SECRET");
  }

  private webhookSecret(): string | undefined {
    return readEnv("RAZORPAY_WEBHOOK_SECRET");
  }

  isConfigured(): boolean {
    return Boolean(this.keyId() && this.keySecret());
  }

  getPublicKeyId(): string | null {
    return this.keyId() ?? null;
  }

  async createRemoteOrder(params: {
    amountPaise: number;
    receipt: string;
    notes?: Record<string, string>;
  }): Promise<RemoteOrderResult> {
    const keyId = this.keyId();
    const keySecret = this.keySecret();
    if (!keyId || !keySecret) {
      throw new PaymentProviderError("Razorpay keys are not configured");
    }
    if (!Number.isInteger(params.amountPaise) || params.amountPaise <= 0) {
      throw new PaymentProviderError(`Invalid amount: ${params.amountPaise}`);
    }
    let res: Response;
    try {
      res = await fetch(`${API_BASE}/orders`, {
        method: "POST",
        headers: {
          Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: params.amountPaise,
          currency: "INR",
          receipt: params.receipt,
          notes: params.notes ?? {},
        }),
      });
    } catch (error) {
      throw new PaymentProviderError(
        `Could not reach Razorpay: ${error instanceof Error ? error.message : "unknown error"}`,
      );
    }
    if (!res.ok) {
      throw new PaymentProviderError(
        `Razorpay order creation failed: ${res.status} ${await res.text()}`,
        res.status,
      );
    }
    const data = (await res.json()) as { id?: string };
    if (!data.id) throw new PaymentProviderError("Razorpay response missing order id");
    return { providerOrderId: data.id };
  }

  verifyCheckoutSignature(params: {
    razorpayOrderId: string;
    razorpayPaymentId: string;
    signature: string;
  }): boolean {
    const secret = this.keySecret();
    if (!secret) return false;
    const expected = createHmac("sha256", secret)
      .update(`${params.razorpayOrderId}|${params.razorpayPaymentId}`)
      .digest("hex");
    return safeEqualHex(expected, params.signature);
  }

  verifyWebhookSignature(params: { rawBody: string; signature: string }): boolean {
    const secret = this.webhookSecret();
    if (!secret) return false;
    const expected = createHmac("sha256", secret).update(params.rawBody, "utf8").digest("hex");
    return safeEqualHex(expected, params.signature);
  }
}

let provider: PaymentProvider | null = null;

/** App-wide provider. PAYMENT_MOCK=true selects the sandbox provider. */
export function getPaymentProvider(): PaymentProvider {
  if (!provider) {
    provider = process.env.PAYMENT_MOCK === "true" ? new MockProvider() : new RazorpayProvider();
  }
  return provider;
}

/** Test seam: force a specific provider instance. */
export function setPaymentProvider(next: PaymentProvider | null): void {
  provider = next;
}
