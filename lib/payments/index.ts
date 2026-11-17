/*
 * Payment provider boundary (PRD Section 6.5: keep the provider behind an
 * interface so it can be swapped). The app talks only to this interface;
 * Razorpay specifics live in payments/razorpay.ts. Swapping providers later
 * means implementing this interface and changing getPaymentProvider().
 */

export class PaymentProviderError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
  ) {
    super(message);
  }
}

export interface RemoteOrderResult {
  providerOrderId: string;
}

export interface PaymentProvider {
  readonly name: string;
  /** True when every secret needed for online checkout is present. */
  isConfigured(): boolean;
  /** Publishable key id for the client to open Checkout. Public by design. */
  getPublicKeyId(): string | null;
  /** Create a remote order for `amountPaise`. Amounts cross this boundary in paise only. */
  createRemoteOrder(params: {
    amountPaise: number;
    receipt: string;
    notes?: Record<string, string>;
  }): Promise<RemoteOrderResult>;
  /** HMAC check of the Checkout handler payload (razorpay_order_id|razorpay_payment_id). */
  verifyCheckoutSignature(params: {
    razorpayOrderId: string;
    razorpayPaymentId: string;
    signature: string;
  }): boolean;
  /** HMAC check of the raw webhook body against X-Razorpay-Signature. */
  verifyWebhookSignature(params: { rawBody: string; signature: string }): boolean;
}
