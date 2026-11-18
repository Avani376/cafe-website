import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getOrderByNumber } from "@/lib/orders";
import { orderNumberSchema } from "@/lib/receipt-schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/*
 * GET /api/orders/[orderNumber] - public order lookup for the "Find my
 * order" feature and receipt fallbacks. Returns a sanitized receipt payload:
 * items, total, status and pickup info - no customer data (none is stored).
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ orderNumber: string }> },
) {
  const { orderNumber } = await params;
  const parsed = orderNumberSchema.safeParse(orderNumber);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const order = getOrderByNumber(getDb(), parsed.data);
  if (!order) {
    return NextResponse.json({ error: "order_not_found" }, { status: 404 });
  }

  const paymentLabel =
    order.status === "paid"
      ? "Paid online"
      : order.status === "pay_at_counter"
        ? "Pay at counter"
        : "Payment pending";

  return NextResponse.json({
    orderNumber: order.orderNumber,
    status: order.status,
    orderType: order.orderType,
    tableNumber: order.tableNumber,
    pickupSlot: order.pickupSlot,
    items: JSON.parse(order.linesJson),
    total: order.total,
    createdAt: order.createdAt,
    paymentLabel,
  });
}
