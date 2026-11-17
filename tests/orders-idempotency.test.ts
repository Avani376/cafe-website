import { createHmac } from "node:crypto";
import { beforeAll, describe, expect, it } from "vitest";
import { createDb, type CafeDatabase, type OrderRow } from "@/lib/db";
import { createOrder, markOrderPaid, OrderError, processWebhookEvent } from "@/lib/orders";
import { orderRequestSchema } from "@/lib/order-schema";
import { toPaise } from "@/lib/pricing";
import type { MenuItem, Site } from "@/lib/content";
import type { PaymentProvider } from "@/lib/payments";
import { RazorpayProvider } from "@/lib/payments/razorpay";

// Dummy test secrets - clearly not real credentials.
process.env.RAZORPAY_KEY_SECRET = "test_key_secret_dummy";
process.env.RAZORPAY_WEBHOOK_SECRET = "test_webhook_secret_dummy";

const flatWhite: MenuItem = {
  id: "flat-white",
  name: "Flat White",
  category: "coffee",
  description: "Double ristretto, steamed milk.",
  price: 180,
  image: "/menu/flat-white.jpg",
  diet: ["veg"],
  tags: [],
  available: true,
  options: [{ id: "oat-milk", label: "Oat milk", price: 40 }],
};

const croissant: MenuItem = {
  id: "butter-croissant",
  name: "Butter Croissant",
  category: "bakery",
  description: "Baked every morning.",
  price: 120,
  image: "/menu/brite.jpg",
  diet: ["veg"],
  tags: [],
  available: true,
  options: [],
};

const menu = { items: [flatWhite, croissant] };

const site: Site = {
  name: "The Cafe",
  tagline: "Neighbourhood cafe",
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

/** Deterministic stub provider: no network, sequential remote order ids. */
function stubProvider(): PaymentProvider {
  let counter = 0;
  return {
    name: "stub",
    isConfigured: () => true,
    getPublicKeyId: () => "pk_test_dummy",
    createRemoteOrder: async () => {
      counter += 1;
      return { providerOrderId: `order_stub_${counter}` };
    },
    verifyCheckoutSignature: () => true,
    verifyWebhookSignature: () => true,
  };
}

let db: CafeDatabase;
const provider = stubProvider();
// Webhook tests exercise real HMAC verification (no network involved).
const webhookProvider = new RazorpayProvider();

beforeAll(() => {
  db = createDb(":memory:");
});

/** Creates one online order; returns the stored row for assertions. */
async function onlineOrder(): Promise<OrderRow> {
  const payload = orderRequestSchema.parse({
    items: [{ itemId: "flat-white", qty: 1 }],
    orderType: "pickup",
    payMethod: "online",
  });
  const { order } = await createOrder(db, menu, site, provider, payload);
  return order;
}

describe("createOrder", () => {
  it("stores a pay-at-counter order with no online charge", async () => {
    const payload = orderRequestSchema.parse({
      items: [{ itemId: "flat-white", optionIds: ["oat-milk"], qty: 2 }],
      orderType: "pickup",
      payMethod: "pay_at_counter",
    });
    const { order, kind } = await createOrder(db, menu, site, provider, payload);
    expect(kind).toBe("pay_at_counter");
    expect(order.status).toBe("pay_at_counter");
    expect(order.total).toBe(220 * 2);
    expect(order.razorpayOrderId).toBeNull();
    expect(order.orderNumber).toBe("K-0001");
  });

  it("creates an online order as pending with a provider order id", async () => {
    const order = await onlineOrder();
    expect(order.status).toBe("pending");
    expect(order.razorpayOrderId).toBe("order_stub_1");
    expect(order.orderNumber).toBe("K-0002");
  });

  it("recomputes the total from menu.json even when the payload carries fake prices", async () => {
    // Zod strips unknown keys, so a tampered client's "price"/"total" fields
    // never reach createOrder; the total is menu price x quantity.
    const parsed = orderRequestSchema.parse({
      items: [{ itemId: "flat-white", qty: 3, price: 1, total: 1 }],
      orderType: "pickup",
      payMethod: "online",
    });
    const { order } = await createOrder(db, menu, site, provider, parsed);
    expect(order.total).toBe(540);
  });

  it("rejects unknown items and slots", async () => {
    const badItem = orderRequestSchema.parse({
      items: [{ itemId: "ghost", qty: 1 }],
      orderType: "pickup",
      payMethod: "pay_at_counter",
    });
    await expect(createOrder(db, menu, site, provider, badItem)).rejects.toBeInstanceOf(OrderError);

    const badSlot = orderRequestSchema.parse({
      items: [{ itemId: "flat-white", qty: 1 }],
      orderType: "pickup",
      pickupSlot: "23:00",
      payMethod: "pay_at_counter",
    });
    await expect(createOrder(db, menu, site, provider, badSlot)).rejects.toBeInstanceOf(OrderError);
  });
});

describe("markOrderPaid idempotency", () => {
  it("marks a pending order paid and records the payment once", async () => {
    const order = await onlineOrder();
    const result = markOrderPaid(db, {
      razorpayOrderId: order.razorpayOrderId ?? undefined,
      razorpayPaymentId: "pay_first",
      amountPaise: toPaise(order.total),
      source: "checkout_verify",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.order.status).toBe("paid");
      expect(result.order.orderNumber).toBe(order.orderNumber);
      expect(result.alreadyRecorded).toBe(false);
    }
    const row = db.$client
      .prepare("SELECT status FROM orders WHERE razorpay_order_id = ?")
      .get(order.razorpayOrderId) as { status: string };
    expect(row.status).toBe("paid");
  });

  it("verifying twice is harmless (no duplicate ledger row)", async () => {
    const order = await onlineOrder();
    const params = {
      razorpayOrderId: order.razorpayOrderId ?? undefined,
      razorpayPaymentId: "pay_twice",
      amountPaise: toPaise(order.total),
      source: "checkout_verify" as const,
    };
    const first = markOrderPaid(db, params);
    expect(first.ok).toBe(true);
    const second = markOrderPaid(db, params);
    expect(second.ok).toBe(true);
    if (second.ok) expect(second.alreadyRecorded).toBe(true);
    const paymentCount = db.$client
      .prepare("SELECT COUNT(*) AS n FROM payments WHERE payment_id = 'pay_twice'")
      .get() as { n: number };
    expect(paymentCount.n).toBe(1);
  });

  it("the same payment cannot mark a different order paid", async () => {
    const first = await onlineOrder();
    const paid = markOrderPaid(db, {
      razorpayOrderId: first.razorpayOrderId ?? undefined,
      razorpayPaymentId: "pay_shared",
      amountPaise: toPaise(first.total),
      source: "checkout_verify",
    });
    expect(paid.ok).toBe(true);

    const second = await onlineOrder();
    const result = markOrderPaid(db, {
      razorpayOrderId: second.razorpayOrderId ?? undefined,
      razorpayPaymentId: "pay_shared",
      source: "checkout_verify",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("payment_used");
    const row = db.$client
      .prepare("SELECT status FROM orders WHERE razorpay_order_id = ?")
      .get(second.razorpayOrderId) as { status: string };
    expect(row.status).toBe("pending");
  });

  it("rejects an amount mismatch against the stored total", async () => {
    const order = await onlineOrder();
    const result = markOrderPaid(db, {
      razorpayOrderId: order.razorpayOrderId ?? undefined,
      razorpayPaymentId: "pay_wrong_amount",
      amountPaise: 9999,
      source: "webhook",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("amount_mismatch");
  });
});

describe("webhook processing", () => {
  function webhookBody(razorpayOrderId: string, paymentId: string, amountPaise: number): string {
    return JSON.stringify({
      event: "payment.captured",
      payload: {
        payment: {
          entity: {
            id: paymentId,
            order_id: razorpayOrderId,
            amount: amountPaise,
            status: "captured",
          },
        },
      },
    });
  }

  function sign(body: string): string {
    return createHmac("sha256", "test_webhook_secret_dummy").update(body, "utf8").digest("hex");
  }

  it("marks the order paid from a captured payment", async () => {
    const order = await onlineOrder();
    const body = webhookBody(order.razorpayOrderId ?? "", "pay_hook_1", toPaise(order.total));
    const result = processWebhookEvent(db, webhookProvider, body, sign(body), "evt_hook_1");
    expect(result.ok).toBe(true);
    expect(result.paidOrder?.orderNumber).toBe(order.orderNumber);
    expect(result.paidOrder?.status).toBe("paid");
  });

  it("replaying the same webhook is harmless", async () => {
    const order = await onlineOrder();
    const body = webhookBody(order.razorpayOrderId ?? "", "pay_hook_2", toPaise(order.total));
    const first = processWebhookEvent(db, webhookProvider, body, sign(body), "evt_hook_2");
    expect(first.ok).toBe(true);
    const replay = processWebhookEvent(db, webhookProvider, body, sign(body), "evt_hook_2");
    expect(replay).toEqual({ ok: true, replay: true });
    const paymentCount = db.$client
      .prepare("SELECT COUNT(*) AS n FROM payments WHERE payment_id = 'pay_hook_2'")
      .get() as { n: number };
    expect(paymentCount.n).toBe(1);
  });

  it("rejects a bad signature without touching the database", async () => {
    const order = await onlineOrder();
    const body = webhookBody(order.razorpayOrderId ?? "", "pay_hook_3", toPaise(order.total));
    const result = processWebhookEvent(db, webhookProvider, body, "bad-signature", "evt_hook_3");
    expect(result.ok).toBe(false);
    expect(result.error).toBe("bad_signature");
    const row = db.$client
      .prepare("SELECT status FROM orders WHERE razorpay_order_id = ?")
      .get(order.razorpayOrderId) as { status: string };
    expect(row.status).toBe("pending");
  });

  it("does not mark paid when the webhook amount does not match", async () => {
    const order = await onlineOrder();
    const body = webhookBody(order.razorpayOrderId ?? "", "pay_hook_4", 100);
    const result = processWebhookEvent(db, webhookProvider, body, sign(body), "evt_hook_4");
    expect(result.ok).toBe(false);
    expect(result.error).toBe("amount_mismatch");
    const row = db.$client
      .prepare("SELECT status FROM orders WHERE razorpay_order_id = ?")
      .get(order.razorpayOrderId) as { status: string };
    expect(row.status).toBe("pending");
  });

  it("deduplicates by event id even when the payload differs", async () => {
    const order = await onlineOrder();
    const body = webhookBody(order.razorpayOrderId ?? "", "pay_hook_5", toPaise(order.total));
    const first = processWebhookEvent(db, webhookProvider, body, sign(body), "evt_hook_5");
    expect(first.ok).toBe(true);
    // Same event id, different body: still treated as a replay.
    const tamperedBody = webhookBody(order.razorpayOrderId ?? "", "pay_hook_5", 42);
    const replay = processWebhookEvent(
      db,
      webhookProvider,
      tamperedBody,
      sign(tamperedBody),
      "evt_hook_5",
    );
    expect(replay).toEqual({ ok: true, replay: true });
  });
});
