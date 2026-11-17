"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Minus, Plus, X } from "lucide-react";
import { lineKey, useCart } from "@/lib/cart-store";
import { loadRazorpayCheckout } from "@/lib/razorpay-client";
import { springs } from "@/lib/motion";
import { computeCart, formatINR } from "@/lib/pricing";
import { getPickupSlots, type PickupSlot } from "@/lib/hours";
import type { Menu, Site } from "@/lib/content";
import { useDialogBehavior } from "./dialog-behavior";

interface CartDrawerProps {
  menu: Menu;
  site: Site;
  copy: Record<string, string>;
  paymentConfigured: boolean;
}

interface SuccessOrder {
  orderNumber: string;
  amount: number;
  pickupSlot: string | null;
  payMethod: "online" | "pay_at_counter";
  items: { name: string; qty: number; lineTotal: number }[];
}

/*
 * Cart drawer (PRD Sections 6.4, 6.5, 7): bottom sheet on mobile, side
 * drawer on desktop; line items with steppers, order type, note, pickup
 * slots from real hours; pays online through Razorpay Checkout or marks the
 * order Pay at counter. The drawer slides with a spring and dims the page;
 * focus is trapped and Escape closes.
 */
export function CartDrawer({ menu, site, copy, paymentConfigured }: CartDrawerProps) {
  const drawerOpen = useCart((s) => s.drawerOpen);
  const closeDrawer = useCart((s) => s.closeDrawer);
  const rawLines = useCart((s) => s.lines);
  const setQty = useCart((s) => s.setQty);
  const clear = useCart((s) => s.clear);
  const add = useCart((s) => s.add);
  const reduce = useReducedMotion();
  const panelRef = useRef<HTMLDivElement | null>(null);

  const [phase, setPhase] = useState<"cart" | "placing" | "success" | "error">("cart");
  const [orderType, setOrderType] = useState<"pickup" | "dine_in">("pickup");
  const [tableNumber, setTableNumber] = useState("");
  const [note, setNote] = useState("");
  const [slot, setSlot] = useState("");
  const [slots, setSlots] = useState<PickupSlot[]>([]);
  const [result, setResult] = useState<SuccessOrder | null>(null);
  const [desktop, setDesktop] = useState(false);

  useDialogBehavior(panelRef, drawerOpen, () => {
    closeDrawer();
    setPhase((p) => (p === "success" || p === "error" ? "cart" : p));
  });

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const onChange = () => setDesktop(mq.matches);
    // Initial check deferred - no synchronous setState in the effect body.
    const initial = setTimeout(onChange, 0);
    mq.addEventListener("change", onChange);
    return () => {
      clearTimeout(initial);
      mq.removeEventListener("change", onChange);
    };
  }, []);

  // Pickup slots come from opening hours, at least 15 minutes ahead
  // (PRD Section 6.4). Recomputed while the drawer is open.
  useEffect(() => {
    if (!drawerOpen) return;
    const refresh = () => setSlots(getPickupSlots(site, new Date()));
    const initial = setTimeout(refresh, 0);
    const timer = setInterval(refresh, 60_000);
    return () => {
      clearTimeout(initial);
      clearInterval(timer);
    };
  }, [drawerOpen, site]);

  // Resolve lines against the menu; unknown ids from old carts are dropped.
  const lines = useMemo(
    () =>
      rawLines
        .map((line) => ({ ...line, item: menu.items.find((i) => i.id === line.itemId) }))
        .filter((l): l is typeof l & { item: NonNullable<typeof l.item> } => Boolean(l.item)),
    [rawLines, menu],
  );

  const totals = useMemo(
    () =>
      computeCart(
        menu,
        lines.map(({ itemId, optionIds, qty }) => ({ itemId, optionIds, qty })),
      ),
    [menu, lines],
  );

  // "Pairs well with" suggestions from menu data (PRD Section 8.3).
  const suggestions = useMemo(() => {
    const inCart = new Set(lines.map((l) => l.itemId));
    const ids = new Set<string>();
    for (const line of lines) {
      for (const pairId of line.item.pairsWith ?? []) {
        if (!inCart.has(pairId)) ids.add(pairId);
      }
    }
    return [...ids]
      .slice(0, 2)
      .map((id) => menu.items.find((i) => i.id === id))
      .filter(
        (item): item is NonNullable<typeof item> => Boolean(item) && Boolean(item?.available),
      );
  }, [lines, menu]);

  function resetAfterSuccess() {
    clear();
    setResult(null);
    setPhase("cart");
    closeDrawer();
  }

  async function handlePay(payMethod: "online" | "pay_at_counter") {
    if (lines.length === 0 || phase !== "cart") return;
    setPhase("placing");
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: lines.map(({ itemId, optionIds, qty }) => ({ itemId, optionIds, qty })),
          orderType,
          tableNumber: orderType === "dine_in" ? tableNumber || undefined : undefined,
          note: note.trim() === "" ? undefined : note.trim(),
          pickupSlot: slot === "" ? undefined : slot,
          payMethod,
        }),
      });
      if (!res.ok) {
        setPhase("error");
        return;
      }
      const data = (await res.json()) as {
        orderNumber: string;
        amount: number;
        currency: string;
        payMethod: "online" | "pay_at_counter";
        pickupSlot: string | null;
        items: { name: string; qty: number; lineTotal: number }[];
        razorpayOrderId: string | null;
        publicKeyId: string | null;
      };

      if (data.payMethod === "pay_at_counter") {
        setResult({
          orderNumber: data.orderNumber,
          amount: data.amount,
          pickupSlot: data.pickupSlot,
          payMethod: "pay_at_counter",
          items: data.items,
        });
        clear();
        setPhase("success");
        return;
      }

      // Online: open Razorpay Checkout (PRD Section 6.5).
      const loaded = await loadRazorpayCheckout();
      if (!loaded || !window.Razorpay || !data.razorpayOrderId || !data.publicKeyId) {
        setPhase("error"); // resilience: cart preserved, pay at counter offered
        return;
      }
      setPhase("placing"); // keep drawer blocked while Checkout is open
      const checkout = new window.Razorpay({
        key: data.publicKeyId,
        order_id: data.razorpayOrderId,
        amount: data.amount, // paise, computed server-side
        currency: data.currency,
        name: site.name,
        description: `Order ${data.orderNumber}`,
        handler: async (response: {
          razorpay_order_id: string;
          razorpay_payment_id: string;
          razorpay_signature: string;
        }) => {
          const verify = await fetch("/api/payments/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(response),
          });
          if (verify.ok) {
            setResult({
              orderNumber: data.orderNumber,
              amount: data.amount,
              pickupSlot: data.pickupSlot,
              payMethod: "online",
              items: data.items,
            });
            clear();
            setPhase("success");
          } else {
            // The webhook still settles this payment if verification failed.
            setPhase("error");
          }
        },
        modal: { ondismiss: () => setPhase("cart") },
      });
      checkout.open();
    } catch {
      setPhase("error");
    }
  }

  const pickupLabel = (value: string | null) => {
    if (!value) return "As soon as possible";
    return slots.find((s) => s.value === value)?.label ?? value;
  };

  return (
    <AnimatePresence>
      {drawerOpen && (
        <div className="fixed inset-0 z-50">
          <motion.button
            type="button"
            aria-label="Close cart"
            onClick={() => {
              closeDrawer();
              setPhase((p) => (p === "success" || p === "error" ? "cart" : p));
            }}
            className="absolute inset-0 bg-foreground/40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          />

          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label="Your order"
            initial={
              reduce
                ? { opacity: 0 }
                : desktop
                  ? { opacity: 0, x: "100%" }
                  : { opacity: 0, y: "100%" }
            }
            animate={reduce ? { opacity: 1 } : { opacity: 1, x: 0, y: 0 }}
            exit={
              reduce
                ? { opacity: 0 }
                : desktop
                  ? { opacity: 0, x: "100%" }
                  : { opacity: 0, y: "100%" }
            }
            transition={springs.soft}
            className={`absolute flex flex-col border-muted/20 bg-surface ${
              desktop
                ? "bottom-0 right-0 top-0 flex w-[420px] rounded-l-2xl border-l"
                : "inset-x-0 bottom-0 max-h-88dvh rounded-t-2xl border-t"
            }`}
          >
            <div className="flex items-center justify-between border-b border-muted/10 px-5 py-4">
              <h2 className="font-display text-xl text-foreground">
                {phase === "success" ? "Order placed" : "Your order"}
              </h2>
              <button
                type="button"
                onClick={() => {
                  closeDrawer();
                  setPhase((p) => (p === "success" || p === "error" ? "cart" : p));
                }}
                aria-label="Close cart"
                className="rounded-card border border-muted/30 p-2 text-foreground"
              >
                <X className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
              </button>
            </div>

            {phase === "success" && result ? (
              <SuccessScreen
                result={result}
                pickupLabel={pickupLabel(result.pickupSlot)}
                message={copy["success.line"] ?? "Order placed."}
                onDone={resetAfterSuccess}
              />
            ) : phase === "error" ? (
              <div className="flex flex-1 flex-col gap-4 p-6">
                <p className="text-foreground">
                  {copy["paymentFailure.line"] ??
                    "The payment did not go through. Your cart is safe."}
                </p>
                {!paymentConfigured && (
                  <p className="text-sm text-muted">
                    Online payment is not set up on this deployment yet. Use Pay at counter.
                  </p>
                )}
                <button
                  type="button"
                  onClick={() => setPhase("cart")}
                  className="rounded-card border border-muted/40 bg-surface px-5 py-3 text-sm text-foreground hover:border-foreground"
                >
                  Back to cart
                </button>
              </div>
            ) : (
              <>
                <div className="flex-1 overflow-y-auto px-5 py-4">
                  {lines.length === 0 ? (
                    <p className="py-12 text-center text-muted">
                      {copy["cart.emptyLine"] ?? "Your cart is empty."}
                    </p>
                  ) : (
                    <>
                      <ul className="flex flex-col divide-y divide-muted/10">
                        {lines.map((line) => {
                          const key = lineKey(line);
                          const lineTotal = totals.lines.find(
                            (pl) => pl.itemId === line.itemId && pl.qty === line.qty,
                          )?.lineTotal;
                          return (
                            <li key={key} className="flex items-center gap-3 py-3">
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm text-foreground">{line.item.name}</p>
                                {line.optionIds.length > 0 && (
                                  <p className="text-xs text-muted">
                                    {line.optionIds
                                      .map(
                                        (id) =>
                                          line.item.options.find((o) => o.id === id)?.label ?? id,
                                      )
                                      .join(", ")}
                                  </p>
                                )}
                              </div>
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  aria-label={`One less ${line.item.name}`}
                                  onClick={() => setQty(key, line.qty - 1)}
                                  className="rounded border border-muted/30 p-1 text-foreground"
                                >
                                  <Minus
                                    className="h-3.5 w-3.5"
                                    strokeWidth={1.75}
                                    aria-hidden="true"
                                  />
                                </button>
                                <span className="min-w-6 text-center text-sm text-foreground">
                                  {line.qty}
                                </span>
                                <button
                                  type="button"
                                  aria-label={`One more ${line.item.name}`}
                                  onClick={() => setQty(key, line.qty + 1)}
                                  className="rounded border border-muted/30 p-1 text-foreground"
                                >
                                  <Plus
                                    className="h-3.5 w-3.5"
                                    strokeWidth={1.75}
                                    aria-hidden="true"
                                  />
                                </button>
                              </div>
                              <span className="w-16 text-right text-sm text-foreground">
                                {lineTotal !== undefined ? formatINR(lineTotal) : ""}
                              </span>
                            </li>
                          );
                        })}
                      </ul>

                      {suggestions.length > 0 && (
                        <div className="mt-4">
                          <p className="text-xs uppercase tracking-wide text-muted">
                            Pairs well with
                          </p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {suggestions.map((suggestion) => (
                              <button
                                key={suggestion.id}
                                type="button"
                                onClick={() => add(suggestion.id)}
                                className="rounded-card border border-muted/30 px-3 py-1.5 text-xs text-foreground hover:border-foreground"
                              >
                                {suggestion.name} + {formatINR(suggestion.price)}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="mt-6 flex flex-col gap-4">
                        <fieldset>
                          <legend className="text-sm text-foreground">Order type</legend>
                          <div className="mt-2 flex gap-2">
                            {(["pickup", "dine_in"] as const).map((type) => (
                              <button
                                key={type}
                                type="button"
                                aria-pressed={orderType === type}
                                onClick={() => setOrderType(type)}
                                className={`rounded-card border px-4 py-2 text-sm capitalize ${
                                  orderType === type
                                    ? "border-foreground text-foreground"
                                    : "border-muted/30 text-muted"
                                }`}
                              >
                                {type === "pickup" ? "Pickup" : "Dine-in"}
                              </button>
                            ))}
                          </div>
                          {orderType === "dine_in" && (
                            <input
                              type="text"
                              inputMode="numeric"
                              value={tableNumber}
                              onChange={(e) => setTableNumber(e.target.value)}
                              placeholder="Table number"
                              aria-label="Table number"
                              className="mt-2 w-full rounded-card border border-muted/30 bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted focus:outline focus:outline-2 focus:outline-offset-1 focus:outline-accent"
                            />
                          )}
                        </fieldset>

                        <label className="flex flex-col gap-1">
                          <span className="text-sm text-foreground">Pickup time</span>
                          <select
                            value={slot}
                            onChange={(e) => setSlot(e.target.value)}
                            disabled={orderType !== "pickup" || slots.length === 0}
                            aria-label="Pickup time"
                            className="rounded-card border border-muted/30 bg-background px-3 py-2 text-sm text-foreground focus:outline focus:outline-2 focus:outline-offset-1 focus:outline-accent"
                          >
                            <option value="">As soon as possible</option>
                            {slots.map((s) => (
                              <option key={s.value} value={s.value}>
                                {s.label}
                              </option>
                            ))}
                          </select>
                          {slots.length === 0 && (
                            <span className="text-xs text-muted">
                              Closed for the rest of the day.
                            </span>
                          )}
                        </label>

                        <label className="flex flex-col gap-1">
                          <span className="text-sm text-foreground">Note (optional)</span>
                          <textarea
                            value={note}
                            maxLength={200}
                            rows={2}
                            onChange={(e) => setNote(e.target.value)}
                            placeholder="Less sugar, no chilli..."
                            aria-label="Order note"
                            className="resize-none rounded-card border border-muted/30 bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted focus:outline focus:outline-2 focus:outline-offset-1 focus:outline-accent"
                          />
                          <span className="text-xs text-muted">{note.length}/200</span>
                        </label>
                      </div>
                    </>
                  )}
                </div>

                {lines.length > 0 && (
                  <div className="border-t border-muted/10 px-5 py-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted">Subtotal</span>
                      <span className="text-foreground">{formatINR(totals.subtotal)}</span>
                    </div>
                    <div className="mt-1 flex items-center justify-between text-sm">
                      <span className="text-muted">Total</span>
                      <span className="font-medium text-foreground">{formatINR(totals.total)}</span>
                    </div>
                    <div className="mt-4 flex gap-2">
                      <button
                        type="button"
                        disabled={phase !== "cart" || !paymentConfigured}
                        onClick={() => handlePay("online")}
                        className="flex-1 rounded-card bg-accent px-4 py-3 text-sm text-surface transition-opacity hover:opacity-90 disabled:opacity-40"
                      >
                        {phase === "placing" ? "Placing order..." : "Pay online"}
                      </button>
                      <button
                        type="button"
                        disabled={phase !== "cart"}
                        onClick={() => handlePay("pay_at_counter")}
                        className="flex-1 rounded-card border border-muted/40 bg-surface px-4 py-3 text-sm text-foreground hover:border-foreground disabled:opacity-40"
                      >
                        Pay at counter
                      </button>
                    </div>
                    <p className="mt-2 text-xs text-muted">
                      {paymentConfigured
                        ? `Prices include taxes. Paid in INR.`
                        : "Online payment is not set up on this deployment yet - use Pay at counter."}
                    </p>
                  </div>
                )}
              </>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

function SuccessScreen({
  result,
  pickupLabel: pickup,
  message,
  onDone,
}: {
  result: SuccessOrder;
  pickupLabel: string;
  message: string;
  onDone: () => void;
}) {
  const reduce = useReducedMotion();
  return (
    <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-6">
      {/* Success moment: the stamp draws itself (PRD Section 7). */}
      <motion.svg
        viewBox="0 0 64 64"
        className="mx-auto h-16 w-16 text-success"
        fill="none"
        initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.9 }}
        animate={reduce ? { opacity: 1 } : { opacity: 1, scale: 1 }}
        transition={springs.soft}
        aria-hidden="true"
      >
        <motion.circle
          cx="32"
          cy="32"
          r="26"
          stroke="currentColor"
          strokeWidth="2.5"
          initial={reduce ? { opacity: 1 } : { pathLength: 0 }}
          animate={{ opacity: 1, pathLength: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        />
        <motion.path
          d="M22 33 L29 40 L43 26"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={reduce ? { opacity: 1 } : { pathLength: 0 }}
          animate={{ opacity: 1, pathLength: 1 }}
          transition={{ duration: 0.35, delay: 0.45 }}
        />
      </motion.svg>

      <p className="text-center font-display text-4xl text-foreground">{result.orderNumber}</p>
      <p className="text-center text-sm text-muted">{message}</p>

      <ul className="mt-2 flex flex-col divide-y divide-muted/10 rounded-card border border-muted/20">
        {result.items.map((item) => (
          <li key={item.name} className="flex items-center justify-between px-4 py-2 text-sm">
            <span className="text-foreground">
              {item.name} x {item.qty}
            </span>
            <span className="text-muted">{formatINR(item.lineTotal)}</span>
          </li>
        ))}
      </ul>

      <div className="text-sm text-muted">
        <p>
          Total: <span className="text-foreground">{formatINR(result.amount)}</span>
        </p>
        <p>
          {result.payMethod === "online" ? "Paid online" : "Pay at counter"}. Pickup: {pickup}.
        </p>
        <p className="mt-2">Take a screenshot - the counter will ask for it.</p>
      </div>

      <button
        type="button"
        onClick={onDone}
        className="mt-auto rounded-card bg-accent px-5 py-3 text-sm text-surface transition-opacity hover:opacity-90"
      >
        Done
      </button>
    </div>
  );
}
