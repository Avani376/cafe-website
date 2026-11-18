import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { RazorpayProvider } from "@/lib/payments/razorpay";
import { MockProvider, mockCapturePayload } from "@/lib/payments/mock";
import { processWebhookEvent, getOrderByNumber } from "@/lib/orders";
import { createDb } from "@/lib/db";
import { orderRequestSchema } from "@/lib/order-schema";
import type { MenuItem, Site } from "@/lib/content";
import type { PaymentProvider } from "@/lib/payments";

// Dummy test secrets - clearly not real credentials.
process.env.RAZORPAY_KEY_ID = "test_key_id";
process.env.RAZORPAY_KEY_SECRET = "test_key_secret_dummy";
process.env.RAZORPAY_WEBHOOK_SECRET = "test_webhook_secret_dummy";

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

/** Fixed-secret stub for creating orders without network access. */
const stubProvider: PaymentProvider = {
  name: "stub",
  isConfigured: () => true,
  getPublicKeyId: () => "pk_test_dummy",
  createRemoteOrder: async () => ({ providerOrderId: "order_sec_1" }),
  verifyCheckoutSignature: () => true,
  verifyWebhookSignature: () => true,
};

async function createOnlineOrder(
  db: ReturnType<typeof createDb>,
): Promise<{ id: string; razorpayOrderId: string }> {
  const payload = orderRequestSchema.parse({
    items: [{ itemId: "flat-white", qty: 1 }],
    orderType: "pickup",
    payMethod: "online",
  });
  const { createOrder } = await import("@/lib/orders");
  const { order } = await createOrder(db, menu, site, stubProvider, payload);
  return { id: order.id, razorpayOrderId: order.razorpayOrderId ?? "" };
}

function webhookBody(
  paymentId: string,
  razorpayOrderId: string,
  amountPaise: number | string,
  status = "captured",
): string {
  return JSON.stringify({
    event: "payment.captured",
    payload: {
      payment: {
        entity: { id: paymentId, order_id: razorpayOrderId, amount: amountPaise, status },
      },
    },
  });
}

function signWebhook(body: string): string {
  return createHmac("sha256", "test_webhook_secret_dummy").update(body, "utf8").digest("hex");
}

describe("signature hardening (hostile inputs must never throw or pass)", () => {
  const provider = new RazorpayProvider();
  const order = "order_sec";
  const payment = "pay_sec";
  const good = (paymentId: string) =>
    createHmac("sha256", "test_key_secret_dummy").update(`${order}|${paymentId}`).digest("hex");

  it("rejects an uppercase copy of a valid signature", () => {
    expect(
      provider.verifyCheckoutSignature({
        razorpayOrderId: order,
        razorpayPaymentId: payment,
        signature: good(payment).toUpperCase(),
      }),
    ).toBe(false);
  });

  it("rejects signatures with appended whitespace or newline injection", () => {
    expect(
      provider.verifyCheckoutSignature({
        razorpayOrderId: order,
        razorpayPaymentId: payment,
        signature: good(payment) + "\n",
      }),
    ).toBe(false);
    expect(
      provider.verifyCheckoutSignature({
        razorpayOrderId: order,
        razorpayPaymentId: payment,
        signature: ` ${good(payment)} `,
      }),
    ).toBe(false);
  });

  it("rejects unicode and oversized signatures without throwing", () => {
    expect(
      provider.verifyCheckoutSignature({
        razorpayOrderId: order,
        razorpayPaymentId: payment,
        signature: "🚀".repeat(64),
      }),
    ).toBe(false);
    expect(
      provider.verifyCheckoutSignature({
        razorpayOrderId: order,
        razorpayPaymentId: payment,
        signature: "a".repeat(100_000),
      }),
    ).toBe(false);
  });

  it("rejects empty order or payment ids", () => {
    expect(
      provider.verifyCheckoutSignature({
        razorpayOrderId: "",
        razorpayPaymentId: payment,
        signature: good(payment),
      }),
    ).toBe(false);
    expect(
      provider.verifyCheckoutSignature({
        razorpayOrderId: order,
        razorpayPaymentId: "",
        signature: good(payment),
      }),
    ).toBe(false);
  });
});

describe("provider isolation (sandbox cannot validate against the real pipeline)", () => {
  const razorpay = new RazorpayProvider();
  const mock = new MockProvider();

  it("a real-Razorpay signature does not validate on the sandbox provider", () => {
    const realSig = createHmac("sha256", "test_key_secret_dummy")
      .update("order_x|pay_x")
      .digest("hex");
    expect(
      razorpay.verifyCheckoutSignature({
        razorpayOrderId: "order_x",
        razorpayPaymentId: "pay_x",
        signature: realSig,
      }),
    ).toBe(true);
    expect(
      mock.verifyCheckoutSignature({
        razorpayOrderId: "order_x",
        razorpayPaymentId: "pay_x",
        signature: realSig,
      }),
    ).toBe(false);
  });

  it("a sandbox capture signature does not validate on the real provider", () => {
    const capture = mockCapturePayload("order_y");
    expect(
      mock.verifyCheckoutSignature({
        razorpayOrderId: capture.razorpayOrderId,
        razorpayPaymentId: capture.razorpayPaymentId,
        signature: capture.razorpaySignature,
      }),
    ).toBe(true);
    expect(
      razorpay.verifyCheckoutSignature({
        razorpayOrderId: capture.razorpayOrderId,
        razorpayPaymentId: capture.razorpayPaymentId,
        signature: capture.razorpaySignature,
      }),
    ).toBe(false);
  });

  it("sandbox webhook signatures never validate against the real webhook secret", () => {
    const body = webhookBody("pay_iso", "order_iso", 18000);
    const sandboxSig = createHmac("sha256", "ember-sandbox-no-real-money")
      .update(body, "utf8")
      .digest("hex");
    expect(razorpay.verifyWebhookSignature({ rawBody: body, signature: sandboxSig })).toBe(false);
  });
});

describe("webhook adversarial payloads", () => {
  const provider = new RazorpayProvider();

  it("a payment.failed webhook never marks an order paid", async () => {
    const db = createDb(":memory:");
    const { id, razorpayOrderId } = await createOnlineOrder(db);
    const body = webhookBody("pay_fail", razorpayOrderId, 18000, "failed");
    const result = processWebhookEvent(db, provider, body, signWebhook(body), "evt_failed");
    expect(result.ok).toBe(true); // valid event, no state change
    expect(result.paidOrder).toBeUndefined();
    const row = db.$client.prepare("SELECT status FROM orders WHERE id = ?").get(id) as {
      status: string;
    };
    expect(row.status).toBe("pending");
  });

  it("a string-typed amount in the webhook is rejected as a mismatch", async () => {
    const db = createDb(":memory:");
    const { id, razorpayOrderId } = await createOnlineOrder(db);
    const body = webhookBody("pay_str", razorpayOrderId, "18000" as unknown as number, "captured");
    const result = processWebhookEvent(db, provider, body, signWebhook(body), "evt_str");
    expect(result.ok).toBe(false);
    expect(result.error).toBe("amount_mismatch");
    const row = db.$client.prepare("SELECT status FROM orders WHERE id = ?").get(id) as {
      status: string;
    };
    expect(row.status).toBe("pending");
  });

  it("prototype-pollution keys in the webhook payload have no effect", async () => {
    const db = createDb(":memory:");
    const { id, razorpayOrderId } = await createOnlineOrder(db);
    const body = JSON.stringify({
      event: "payment.captured",
      payload: {
        payment: {
          entity: {
            id: "pay_pollute",
            order_id: razorpayOrderId,
            amount: 18000,
            status: "captured",
            __proto__: { polluted: "yes" },
          },
        },
      },
    });
    const result = processWebhookEvent(db, provider, body, signWebhook(body), "evt_pollute");
    expect(result.ok).toBe(true);
    expect((globalThis as Record<string, unknown>).polluted).toBeUndefined();
    expect((Object.prototype as Record<string, unknown>).polluted).toBeUndefined();
    const row = db.$client.prepare("SELECT status FROM orders WHERE id = ?").get(id) as {
      status: string;
    };
    expect(row.status).toBe("paid");
  });
});

describe("boundary hygiene", () => {
  it("parameterized order lookup is immune to SQL injection", async () => {
    const db = createDb(":memory:");
    const payload = orderRequestSchema.parse({
      items: [{ itemId: "flat-white", qty: 1 }],
      orderType: "pickup",
      payMethod: "pay_at_counter",
    });
    const { createOrder } = await import("@/lib/orders");
    await createOrder(db, menu, site, stubProvider, payload);

    const hostile = "K-0001'; DROP TABLE orders;--";
    expect(getOrderByNumber(db, hostile)).toBeUndefined();
    // The table must still exist and still hold the order.
    const rows = db.$client.prepare("SELECT COUNT(*) AS n FROM orders").get() as { n: number };
    expect(rows.n).toBe(1);
  });

  it("the verify route rejects hostile bodies with 400 before touching the database", async () => {
    const { POST } = await import("@/app/api/payments/verify/route");
    const url = "http://localhost/api/payments/verify";

    const notJson = await POST(new Request(url, { method: "POST", body: "{{{" }));
    expect(notJson.status).toBe(400);

    const missingFields = await POST(
      new Request(url, {
        method: "POST",
        body: JSON.stringify({ razorpay_order_id: "order_x" }),
      }),
    );
    expect(missingFields.status).toBe(400);

    const badSignature = await POST(
      new Request(url, {
        method: "POST",
        body: JSON.stringify({
          razorpay_order_id: "order_x",
          razorpay_payment_id: "pay_x",
          razorpay_signature: "deadbeef",
        }),
      }),
    );
    expect(badSignature.status).toBe(400);
    const body = (await badSignature.json()) as { error?: string };
    expect(body.error).toBe("invalid_signature");
  });

  it("the mock-capture route is disabled outside sandbox mode (403)", async () => {
    const saved = process.env.PAYMENT_MOCK;
    delete process.env.PAYMENT_MOCK;
    try {
      const { POST } = await import("@/app/api/payments/mock-capture/route");
      const res = await POST(
        new Request("http://localhost/api/payments/mock-capture", {
          method: "POST",
          body: JSON.stringify({ razorpayOrderId: "mock_order_x" }),
        }),
      );
      expect(res.status).toBe(403);
    } finally {
      if (saved !== undefined) process.env.PAYMENT_MOCK = saved;
    }
  });

  it("server-only secrets are never referenced in client components", async () => {
    const fs = await import("node:fs");
    const path = await import("node:path");
    const serverOnly =
      /process\.env\.(RAZORPAY_KEY_SECRET|RAZORPAY_WEBHOOK_SECRET|PAYMENT_MOCK_SECRET|DATABASE_URL)/;
    const violations: string[] = [];
    const root = path.resolve(process.cwd());

    for (const dir of ["app", "components", "lib"]) {
      const base = path.resolve(process.cwd(), dir);
      // readdirSync(recursive) returns relative paths; resolve + boundary-check
      // every file before reading (the scanner-suggested pattern).
      for (const rel of fs.readdirSync(base, { recursive: true }) as string[]) {
        if (!/\.tsx?$/.test(rel)) continue;
        const full = path.resolve(base, rel);
        if (!full.startsWith(root + path.sep)) continue;
        const content = fs.readFileSync(full, "utf8");
        if (content.includes('"use client"') && serverOnly.test(content)) {
          violations.push(path.relative(root, full));
        }
      }
    }
    expect(violations).toEqual([]);
  });

  it("the rate limiter blocks beyond the limit and recovers after the window", async () => {
    const { rateLimit } = await import("@/lib/rate-limit");
    const { vi } = await import("vitest");
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
      expect(rateLimit("rl-test", 2, 60_000).ok).toBe(true);
      expect(rateLimit("rl-test", 2, 60_000).ok).toBe(true);
      expect(rateLimit("rl-test", 2, 60_000).ok).toBe(false);
      vi.setSystemTime(new Date("2026-01-01T00:02:00Z")); // window expired
      expect(rateLimit("rl-test", 2, 60_000).ok).toBe(true);
      expect(rateLimit("other-key", 2, 60_000).ok).toBe(true); // keys are isolated
    } finally {
      vi.useRealTimers();
    }
  });
});
