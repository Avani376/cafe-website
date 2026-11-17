import Database from "better-sqlite3";
import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

/*
 * Order storage (PRD Section 6.5: "At minimum, orders are written to a
 * database table the owner can view").
 *
 * Driver: SQLite via Drizzle (PRD Section 9). Swapping to Supabase Postgres
 * later means replacing the driver import and column types here only - all
 * order access goes through lib/orders.ts, so nothing else changes.
 *
 * Status values: pending | paid | pay_at_counter.
 * Money: rupees as integers, per lib/pricing.ts.
 *
 * Database file: fixed relative path "db/cafe.db" (must exist; created by
 * scripts/ensure-data-dir.mjs before dev/build). ":memory:" is allowed for
 * tests. No runtime directory creation and no .exec() in this module.
 */

/** Literally allowed database targets. Everything else is rejected. */
const ALLOWED_DB_TARGETS = [":memory:", "db/cafe.db"] as const;
export type DbTarget = (typeof ALLOWED_DB_TARGETS)[number];

export function isAllowedDbTarget(value: string): value is DbTarget {
  return (ALLOWED_DB_TARGETS as readonly string[]).includes(value);
}

export const orders = sqliteTable("orders", {
  id: text("id").primaryKey(), // internal uuid
  orderNumber: text("order_number").notNull().unique(), // short readable, e.g. K-0412
  status: text("status").notNull(), // pending | paid | pay_at_counter
  orderType: text("order_type").notNull(), // pickup | dine_in
  tableNumber: text("table_number"),
  note: text("note"),
  pickupSlot: text("pickup_slot"),
  linesJson: text("lines_json").notNull(), // snapshot of priced lines at order time
  subtotal: integer("subtotal").notNull(),
  tax: integer("tax").notNull(),
  total: integer("total").notNull(),
  razorpayOrderId: text("razorpay_order_id").unique(),
  razorpayPaymentId: text("razorpay_payment_id").unique(),
  createdAt: integer("created_at").notNull(),
  paidAt: integer("paid_at"),
});

// Payment ledger. payment_id is the primary key, which makes "the same
// payment cannot mark two orders paid" a database-level guarantee.
export const payments = sqliteTable("payments", {
  paymentId: text("payment_id").primaryKey(),
  orderId: text("order_id").notNull(),
  amount: integer("amount").notNull(), // rupees
  source: text("source").notNull(), // checkout_verify | webhook
  receivedAt: integer("received_at").notNull(),
});

// Webhook event log for replay idempotency.
export const webhookEvents = sqliteTable("webhook_events", {
  eventId: text("event_id").primaryKey(),
  receivedAt: integer("received_at").notNull(),
});

export type OrderRow = typeof orders.$inferSelect;
export type NewOrderRow = typeof orders.$inferInsert;

const CREATE_TABLES: readonly string[] = [
  `CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,
    order_number TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL,
    order_type TEXT NOT NULL,
    table_number TEXT,
    note TEXT,
    pickup_slot TEXT,
    lines_json TEXT NOT NULL,
    subtotal INTEGER NOT NULL,
    tax INTEGER NOT NULL,
    total INTEGER NOT NULL,
    razorpay_order_id TEXT UNIQUE,
    razorpay_payment_id TEXT UNIQUE,
    created_at INTEGER NOT NULL,
    paid_at INTEGER
  )`,
  `CREATE TABLE IF NOT EXISTS payments (
    payment_id TEXT PRIMARY KEY,
    order_id TEXT NOT NULL,
    amount INTEGER NOT NULL,
    source TEXT NOT NULL,
    received_at INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS webhook_events (
    event_id TEXT PRIMARY KEY,
    received_at INTEGER NOT NULL
  )`,
];

const schema = { orders, payments, webhookEvents };

export type CafeDatabase = BetterSQLite3Database<typeof schema> & {
  $client: Database.Database;
};

/** Open (or create) the schema at an allowed target. */
export function createDb(target: DbTarget): CafeDatabase {
  if (!isAllowedDbTarget(target)) {
    throw new Error("DATABASE target must be an allowed literal target");
  }
  const client = new Database(target);
  client.pragma("journal_mode = WAL");
  for (const statement of CREATE_TABLES) {
    client.prepare(statement).run();
  }
  return drizzle(client, { schema }) as CafeDatabase;
}

let singleton: CafeDatabase | null = null;

/** App-wide database handle. Env override is limited to the allowlist. */
export function getDb(): CafeDatabase {
  if (!singleton) {
    const fromEnv = process.env.DATABASE_URL?.replace(/^file:/, "").trim();
    if (fromEnv !== undefined && !isAllowedDbTarget(fromEnv)) {
      throw new Error(
        "DATABASE_URL must be db/cafe.db (or omit it). The allowlist is in lib/db.ts.",
      );
    }
    singleton = createDb(fromEnv ?? "db/cafe.db");
  }
  return singleton;
}
