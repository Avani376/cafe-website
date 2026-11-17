import { describe, expect, it } from "vitest";
import { computeCart, formatINR, priceLine, PricingError, toPaise } from "@/lib/pricing";
import type { MenuItem } from "@/lib/content";

const flatWhite: MenuItem = {
  id: "flat-white",
  name: "Flat White",
  category: "coffee",
  description: "Double ristretto, steamed milk.",
  price: 180,
  image: "/menu/flat-white.jpg",
  diet: ["veg"],
  tags: ["bestseller"],
  available: true,
  options: [
    { id: "oat-milk", label: "Oat milk", price: 40 },
    { id: "extra-shot", label: "Extra shot", price: 50 },
  ],
};

const croissant: MenuItem = {
  id: "butter-croissant",
  name: "Butter Croissant",
  category: "bakery",
  description: "Laminated, baked every morning.",
  price: 120,
  image: "/menu/butter-croissant.jpg",
  diet: ["veg"],
  tags: [],
  available: true,
  options: [],
};

const soldOut: MenuItem = {
  ...croissant,
  id: "banana-bread",
  name: "Banana Bread Slice",
  price: 100,
  available: false,
};

describe("formatINR", () => {
  it("formats with the rupee symbol and Indian digit grouping", () => {
    expect(formatINR(180)).toBe("\u20B9180");
    expect(formatINR(123456)).toBe("\u20B91,23,456");
    expect(formatINR(1234567)).toBe("\u20B912,34,567");
  });
});

describe("toPaise", () => {
  it("converts rupees to paise exactly once, at the payment boundary", () => {
    expect(toPaise(180)).toBe(18000);
    expect(toPaise(0)).toBe(0);
  });
  it("rejects non-integer or negative rupee amounts", () => {
    expect(() => toPaise(1.5)).toThrow();
    expect(() => toPaise(-1)).toThrow();
  });
});

describe("priceLine", () => {
  it("prices an item with selected options", () => {
    const line = priceLine(flatWhite, ["oat-milk", "extra-shot"], 2);
    expect(line.unitPrice).toBe(180 + 40 + 50);
    expect(line.lineTotal).toBe(270 * 2);
  });

  it("prices a plain item", () => {
    expect(priceLine(croissant, [], 3).lineTotal).toBe(360);
  });

  it("rejects unknown option ids", () => {
    expect(() => priceLine(flatWhite, ["soy-milk"], 1)).toThrow(PricingError);
  });

  it("rejects sold out items", () => {
    expect(() => priceLine(soldOut, [], 1)).toThrow(PricingError);
  });

  it("rejects invalid quantities", () => {
    expect(() => priceLine(croissant, [], 0)).toThrow(PricingError);
    expect(() => priceLine(croissant, [], 21)).toThrow(PricingError);
    expect(() => priceLine(croissant, [], 1.5)).toThrow(PricingError);
  });
});

describe("computeCart", () => {
  it("computes subtotal and total from menu.json prices only", () => {
    const totals = computeCart({ items: [flatWhite, croissant, soldOut] }, [
      { itemId: "flat-white", optionIds: ["oat-milk"], qty: 2 },
      { itemId: "butter-croissant", qty: 1 },
    ]);
    expect(totals.lines).toHaveLength(2);
    expect(totals.subtotal).toBe(220 * 2 + 120);
    expect(totals.total).toBe(totals.subtotal);
    expect(totals.tax).toBe(0); // GST decision pending, see lib/pricing.ts
  });

  it("rejects unknown item ids", () => {
    expect(() => computeCart({ items: [flatWhite] }, [{ itemId: "ghost", qty: 1 }])).toThrow(
      PricingError,
    );
  });

  it("never accepts client-supplied prices - the input shape has none", () => {
    // Even if a tampered client sends extra fields, the priced output is
    // derived exclusively from menu data.
    const hostilePayload = {
      itemId: "flat-white",
      optionIds: [],
      qty: 1,
      price: 1,
      total: 1,
    } as unknown as { itemId: string; qty: number; optionIds?: string[] };
    const totals = computeCart({ items: [flatWhite] }, [hostilePayload]);
    expect(totals.total).toBe(180);
  });
});
