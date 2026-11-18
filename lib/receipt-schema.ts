import { z } from "zod";

/*
 * Receipt and order-lookup shapes shared by the API route, the receipt page
 * and the client fallback. Order numbers look like K-0412.
 */
export const orderNumberSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^K-\d{4}$/, "Order numbers look like K-0412");

export interface ReceiptLine {
  name: string;
  qty: number;
  lineTotal: number;
}

export interface ReceiptData {
  orderNumber: string;
  status: string;
  orderType: string;
  tableNumber: string | null;
  pickupSlot: string | null;
  items: ReceiptLine[];
  total: number;
  createdAt: number;
  paymentLabel: string;
}
