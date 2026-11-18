import { randomUUID, createHash } from "node:crypto";
import type { CafeDatabase, OrderRow } from "./db";
import type { MenuItem, Site } from "./content";
import type { PaymentProvider } from "./payments";
import type { OrderRequest } from "./order-schema";
import { computeCart, toPaise, PricingError, type CartTotals } from "./pricing";
import { isValidPickupSlot } from "./hours";

/*
 * Order and payment state machine (PRD Section 6.5). All money flows through
 * here so rules are enforced in exactly one place:
 *
 * - The client sends item/option ids and quantities only (OrderRequest has no
 *   price fields). Totals are recomputed from menu.json via computeCart.
 * - Online orders call the provider for a remote order, stored as pending.
 * - Pay-at-counter orders are stored as pay_at_counter with no online charge.
 * - markOrderPaid is idempotent: the payment ledger's payment_id primary key
 *   makes "the same payment cannot mark two orders paid" a hard guarantee,
 *   and double verification or webhook replays are harmless no-ops.
 * - The webhook is the source of truth for paid status (handles the tab
 *   closed after paying).
 */

export class OrderError extends Error {
  constructor(
    public readonly code:
      "empty_cart" | "unknown_item" | "invalid_slot" | "payment_unconfigured" | "provider_failed",
    message: string,
  ) {
    super(message);
  }
}

/*
 * Raw sqlite rows come back in snake_case; map them onto the camelCase
 * OrderRow shape once, here, so callers never see raw column names.
 */
function mapOrder(raw: unknown): OrderRow | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const row = raw as Record<string, unknown>;
  return {
    id: row.id as string,
    orderNumber: row.order_number as string,
    status: row.status as string,
    orderType: row.order_type as string,
    tableNumber: (row.table_number as string | null) ?? null,
    note: (row.note as string | null) ?? null,
    pickupSlot: (row.pickup_slot as string | null) ?? null,
    linesJson: row.lines_json as string,
    subtotal: row.subtotal as number,
    tax: row.tax as number,
    total: row.total as number,
    razorpayOrderId: (row.razorpay_order_id as string | null) ?? null,
    razorpayPaymentId: (row.razorpay_payment_id as string | null) ?? null,
    createdAt: row.created_at as number,
    paidAt: (row.paid_at as number | null) ?? null,
  };
}

export interface CreateOrderResult {
  order: OrderRow;
  kind: "online" | "pay_at_counter";
  publicKeyId: string | null;
}

/** Short readable order number, e.g. K-0412 (PRD Section 6.5). */
function nextOrderNumber(db: CafeDatabase): string {
  const row = db.$client
    .prepare(
      "SELECT MAX(CAST(SUBSTR(order_number, 3) AS INTEGER)) AS maxSeq FROM orders WHERE order_number LIKE 'K-%'",
    )
    .get() as { maxSeq: number | null };
  return `K-${String((row.maxSeq ?? 0) + 1).padStart(4, "0")}`;
}

/** Look up one order by its short readable number (receipts, order lookup). */
export function getOrderByNumber(db: CafeDatabase, orderNumber: string): OrderRow | undefined {
  return mapOrder(
    db.$client.prepare("SELECT * FROM orders WHERE order_number = ?").get(orderNumber),
  );
}

export async function createOrder(
  db: CafeDatabase,
  menu: { items: MenuItem[] },
  site: Pick<Site, "hours" | "timezone">,
  provider: PaymentProvider,
  payload: OrderRequest,
): Promise<CreateOrderResult> {
  if (payload.payMethod === "online" && !provider.isConfigured()) {
    throw new OrderError("payment_unconfigured", "Online payment is not set up");
  }
  if (payload.pickupSlot && !isValidPickupSlot(site, payload.pickupSlot)) {
    throw new OrderError("invalid_slot", "Pickup slot is outside opening hours");
  }

  let totals: CartTotals;
  try {
    totals = computeCart(menu, payload.items);
  } catch (error) {
    if (error instanceof PricingError) {
      throw new OrderError("unknown_item", error.message);
    }
    throw error;
  }

  const orderNumber = nextOrderNumber(db);
  const id = randomUUID();
  let razorpayOrderId: string | null = null;
  if (payload.payMethod === "online") {
    const remote = await provider.createRemoteOrder({
      amountPaise: toPaise(totals.total),
      receipt: orderNumber,
      notes: { order_number: orderNumber },
    });
    razorpayOrderId = remote.providerOrderId;
  }

  const now = Date.now();
  const inserted = db.$client
    .prepare(
      `INSERT INTO orders (id, order_number, status, order_type, table_number, note, pickup_slot, lines_json, subtotal, tax, total, razorpay_order_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      id,
      orderNumber,
      payload.payMethod === "online" ? "pending" : "pay_at_counter",
      payload.orderType,
      payload.tableNumber ?? null,
      payload.note ?? null,
      payload.pickupSlot ?? null,
      JSON.stringify(totals.lines),
      totals.subtotal,
      totals.tax,
      totals.total,
      razorpayOrderId,
      now,
    );

  const order = mapOrder(db.$client.prepare("SELECT * FROM orders WHERE id = ?").get(id));
  if (!inserted.changes || !order) {
    throw new OrderError("provider_failed", "Order could not be stored");
  }

  return {
    order,
    kind: payload.payMethod === "online" ? "online" : "pay_at_counter",
    publicKeyId: provider.getPublicKeyId(),
  };
}

export type MarkPaidResult =
  | { ok: true; order: OrderRow; alreadyRecorded: boolean }
  | { ok: false; error: "order_not_found" | "payment_used" | "amount_mismatch" | "invalid_status" };

export interface MarkPaidParams {
  razorpayOrderId?: string;
  orderId?: string;
  razorpayPaymentId: string;
  /** Provided for payment events; checked against the stored total. */
  amountPaise?: number;
  source: "checkout_verify" | "webhook";
}

/**
 * Mark an order paid, idempotently.
 * - Same payment id again (double verify, webhook replay): harmless no-op.
 * - Same payment id on a DIFFERENT order: rejected - one payment, one order.
 * - Amount mismatch vs stored total: rejected.
 */
export function markOrderPaid(db: CafeDatabase, params: MarkPaidParams): MarkPaidResult {
  const selectOrder = db.$client.prepare(
    "SELECT * FROM orders WHERE (razorpay_order_id = ? AND razorpay_order_id IS NOT NULL) OR (id = ? AND ? != '')",
  );
  const args = [params.razorpayOrderId ?? "", params.orderId ?? "", params.orderId ?? ""];
  const order = mapOrder(selectOrder.get(...args));
  if (!order) return { ok: false, error: "order_not_found" };

  const findPayment = db.$client.prepare("SELECT order_id FROM payments WHERE payment_id = ?");
  const existingPayment = findPayment.get(params.razorpayPaymentId) as
    { order_id: string } | undefined;
  if (existingPayment) {
    if (existingPayment.order_id === order.id) {
      return { ok: true, order, alreadyRecorded: true };
    }
    return { ok: false, error: "payment_used" };
  }

  if (params.amountPaise !== undefined && params.amountPaise !== toPaise(order.total)) {
    return { ok: false, error: "amount_mismatch" };
  }

  if (order.status === "paid" || order.status === "pay_at_counter") {
    // Order already terminal; recording a fresh payment against it would
    // double-charge the cafe's books. Only the ledger row above can make it
    // a no-op.
    return { ok: false, error: "invalid_status" };
  }

  const paymentUsedElsewhere = db.$client
    .prepare("SELECT id FROM orders WHERE razorpay_payment_id = ? AND id != ?")
    .get(params.razorpayPaymentId, order.id) as { id: string } | undefined;
  if (paymentUsedElsewhere) return { ok: false, error: "payment_used" };

  const now = Date.now();
  const run = db.$client.transaction(() => {
    db.$client
      .prepare(
        "UPDATE orders SET status = 'paid', paid_at = ?, razorpay_payment_id = ? WHERE id = ?",
      )
      .run(now, params.razorpayPaymentId, order.id);
    db.$client
      .prepare(
        "INSERT INTO payments (payment_id, order_id, amount, source, received_at) VALUES (?, ?, ?, ?, ?)",
      )
      .run(params.razorpayPaymentId, order.id, order.total, params.source, now);
  });
  run();

  const updated = mapOrder(db.$client.prepare("SELECT * FROM orders WHERE id = ?").get(order.id));
  return { ok: true, order: updated as OrderRow, alreadyRecorded: false };
}

export interface WebhookProcessResult {
  ok: boolean;
  replay?: boolean;
  error?: "bad_signature" | "bad_payload" | string;
  /** Set when this event freshly marked an order paid (for notifications). */
  paidOrder?: OrderRow;
}

/**
 * Process one Razorpay webhook event. The webhook is the source of truth for
 * paid status. Signature verification happens against the RAW request body.
 */
export function processWebhookEvent(
  db: CafeDatabase,
  provider: PaymentProvider,
  rawBody: string,
  signature: string,
  eventId?: string,
): WebhookProcessResult {
  if (!provider.verifyWebhookSignature({ rawBody, signature })) {
    return { ok: false, error: "bad_signature" };
  }

  let event: {
    event?: string;
    payload?: {
      payment?: { entity?: { id?: string; order_id?: string; amount?: number; status?: string } };
      order?: { entity?: { id?: string } };
    };
  };
  try {
    event = JSON.parse(rawBody);
  } catch {
    return { ok: false, error: "bad_payload" };
  }

  const id = eventId ?? fallbackEventId(rawBody);

  const insertEvent = db.$client.prepare(
    "INSERT OR IGNORE INTO webhook_events (event_id, received_at) VALUES (?, ?)",
  );
  const result = insertEvent.run(id, Date.now());
  if (result.changes === 0) {
    return { ok: true, replay: true };
  }

  const paymentEntity = event.payload?.payment?.entity;
  const orderEntityId = event.payload?.order?.entity?.id;
  const razorpayOrderId = paymentEntity?.order_id ?? orderEntityId;

  if (razorpayOrderId && paymentEntity?.id && paymentEntity.status === "captured") {
    const marked = markOrderPaid(db, {
      razorpayOrderId,
      razorpayPaymentId: paymentEntity.id,
      amountPaise: paymentEntity.amount,
      source: "webhook",
    });
    if (!marked.ok && marked.error !== "order_not_found") {
      return { ok: false, error: marked.error };
    }
    if (marked.ok && !marked.alreadyRecorded) {
      return { ok: true, paidOrder: marked.order };
    }
  }

  return { ok: true };
}

function fallbackEventId(rawBody: string): string {
  return createHash("sha256").update(rawBody).digest("hex").slice(0, 32);
}
