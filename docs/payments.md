# Payments: Razorpay in test mode

Status: implemented behind a `PaymentProvider` interface
(`lib/payments/index.ts`, Razorpay implementation in
`lib/payments/razorpay.ts`). No Razorpay SDK dependency - the REST API is
called directly and signatures are verified with `node:crypto` HMACs.

## Flow (PRD Section 6.5)

1. Client sends item ids, option ids and quantities to `POST /api/orders`.
   The payload schema (`lib/order-schema.ts`) has no price fields; the server
   recomputes the total from `content/menu.json` (`lib/pricing.ts`).
2. Online: the server creates a Razorpay order (amount in paise, converted
   exactly once via `toPaise`), stores the order as `pending`, and returns
   `razorpay_order_id` + the public key id. The client opens Razorpay
   Checkout (`lib/razorpay-client.ts` loads the script on demand; if it fails
   to load, the cart shows a message and offers Pay at counter - PRD
   Section 10, Resilience).
3. On success the client calls `POST /api/payments/verify` with the Checkout
   handler payload. The server verifies the HMAC of
   `razorpay_order_id|razorpay_payment_id` with `RAZORPAY_KEY_SECRET` and
   marks the order `paid`.
4. `POST /api/webhooks/razorpay` verifies the webhook signature over the RAW
   body with `RAZORPAY_WEBHOOK_SECRET` and is the **source of truth** for
   paid status (covers the user closing the tab after paying).

## Idempotency guarantees

- `payments.payment_id` is a PRIMARY KEY: the same payment can never mark
  two orders paid (enforced in `lib/orders.ts` and at the database level).
- Verifying twice, or replaying a webhook, is a harmless no-op: the payment
  ledger is checked first; `webhook_events` deduplicates by event id.
- Payment amounts are checked against the stored total; mismatches are
  rejected without touching order state.
- Tested in `tests/orders-idempotency.test.ts` (replay, double verify,
  payment reuse, amount mismatch) and `tests/payments-signature.test.ts`
  (signature tampering).

## Pay at counter

`payMethod: "pay_at_counter"` creates the order with status
`pay_at_counter`, no Razorpay order and no online charge. The cafe is
notified by email immediately.

## Environment variables (secrets only from env, never in code)

`RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET` - see
`.env.example`. On Vercel, set them in Project Settings -> Environment
Variables for each environment (preview + production).

## Sandbox payments (no keys required)

Set `PAYMENT_MOCK=true` to route through `MockProvider`
(`lib/payments/mock.ts`) behind the same `PaymentProvider` interface:

- `POST /api/orders` creates a pending order with a `mock_order_*` id.
- The cart opens a clearly-labelled **Sandbox payment** sheet with two
  buttons - "Simulate successful payment" and "Simulate failed payment" -
  so both the success and failure screens are testable.
- Success calls `POST /api/payments/mock-capture`, which builds the handler
  payload server-side, verifies it with the provider's own HMAC check, and
  marks the order paid through the same `markOrderPaid` pipeline
  (idempotency rules fully apply).
- The route returns 403 when the app is not running the sandbox provider,
  and the UI never shows the sandbox sheet in production mode.

Real Razorpay keys take over automatically when set (env-based selection in
`getPaymentProvider`). The sandbox secret lives in `PAYMENT_MOCK_SECRET`
(any dev string; not a credential).

## Going live checklist

1. Razorpay dashboard -> create/live-switch account; complete KYC.
2. Generate **live** API keys; set them as env vars on Vercel production.
3. Register the webhook: URL `https://<your-domain>/api/webhooks/razorpay`,
   events `payment.captured` and `order.paid`; copy the generated secret
   into `RAZORPAY_WEBHOOK_SECRET`.
4. Verify the public site uses HTTPS (Checkout requires it).
5. Place a real small order end to end with UPI.
6. Issue a test refund from the Razorpay dashboard and confirm the cafe's
   books/manual process.
7. Confirm order emails arrive (not in spam) - adjust the Resend sender
   domain if needed.
8. Only then swap to live keys; keep test keys in `.env.local` for
   development.

## Database note

Local development uses SQLite (`db/cafe.db`, allowlisted in `lib/db.ts`).
SQLite does not persist on Vercel serverless; before real production
traffic, swap the driver in `lib/db.ts` to Supabase Postgres
(`DATABASE_URL` from the Supabase project) - all order access already goes
through `lib/orders.ts`, so nothing else changes.

## Security headers / CSP

Basic headers are set in `next.config.ts`. A strict CSP allowing
`https://checkout.razorpay.com` (script/frame) is a Phase 6 launch item.
