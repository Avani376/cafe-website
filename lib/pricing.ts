import type { MenuItem, MenuOption } from "./content";

/*
 * Money rules (working rule 5, PRD Section 6.3):
 * - Prices are INR integers in RUPEES everywhere in content, storage and UI.
 * - Paise exist only at the Razorpay API boundary (toPaise), in one place.
 * - The client sends item/option ids and quantities only. Every price is
 *   recomputed here from menu.json. Client-sent amounts are ignored.
 */

export function formatINR(amountRupees: number): string {
  return `\u20B9${new Intl.NumberFormat("en-IN").format(amountRupees)}`;
}

export function toPaise(rupees: number): number {
  if (!Number.isInteger(rupees) || rupees < 0) {
    throw new Error(`Rupee amounts must be non-negative integers, got ${rupees}`);
  }
  return rupees * 100;
}

export class PricingError extends Error {}

export interface PricedOption {
  id: string;
  label: string;
  price: number;
}

export interface PricedLine {
  itemId: string;
  name: string;
  qty: number;
  unitPrice: number;
  lineTotal: number;
  options: PricedOption[];
}

/**
 * Resolve one cart line against the menu. Unknown items or options throw -
 * callers must not fall back to client values.
 */
export function priceLine(item: MenuItem, optionIds: string[], qty: number): PricedLine {
  if (!item.available) throw new PricingError(`Item is sold out: ${item.id}`);
  if (!Number.isInteger(qty) || qty < 1 || qty > 20) {
    throw new PricingError(`Invalid quantity for ${item.id}: ${qty}`);
  }
  const options: PricedOption[] = optionIds.map((optionId) => {
    const match = item.options.find((o: MenuOption) => o.id === optionId);
    if (!match) throw new PricingError(`Unknown option ${optionId} for item ${item.id}`);
    return { id: match.id, label: match.label, price: match.price };
  });
  const unitPrice = item.price + options.reduce((sum, o) => sum + o.price, 0);
  return {
    itemId: item.id,
    name: item.name,
    qty,
    unitPrice,
    lineTotal: unitPrice * qty,
    options,
  };
}

export interface CartLineInput {
  itemId: string;
  optionIds?: string[];
  qty: number;
}

export interface CartTotals {
  lines: PricedLine[];
  subtotal: number; // rupees
  tax: number; // rupees; GST display decision pending - see docs/content-guide.md
  total: number; // rupees
}

/**
 * Compute the full cart total from menu.json. GST decision (inclusive vs
 * added at checkout) is unanswered (PRD Section 15), so tax is 0 and prices
 * are treated as tax-inclusive until the owner decides.
 */
export function computeCart(menu: { items: MenuItem[] }, lines: CartLineInput[]): CartTotals {
  const priced = lines.map((line) => {
    const item = menu.items.find((i) => i.id === line.itemId);
    if (!item) throw new PricingError(`Unknown item id: ${line.itemId}`);
    return priceLine(item, line.optionIds ?? [], line.qty);
  });
  const subtotal = priced.reduce((sum, l) => sum + l.lineTotal, 0);
  return { lines: priced, subtotal, tax: 0, total: subtotal };
}
