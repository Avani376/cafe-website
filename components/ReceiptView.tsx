import { formatINR } from "@/lib/pricing";
import type { ReceiptData } from "@/lib/receipt-schema";

/*
 * Presentational receipt - no hooks, so it renders on the server receipt
 * page and inside client fallbacks alike. The `receipt` class marks the
 * printable area for the print stylesheet.
 */
export function ReceiptView({ receipt, cafeName }: { receipt: ReceiptData; cafeName: string }) {
  const placed = new Date(receipt.createdAt).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
  const dineIn = receipt.orderType === "dine_in";
  const paid = receipt.status === "paid";

  return (
    <article className="receipt mx-auto w-full max-w-md rounded-card border border-muted/30 bg-surface p-6">
      <header className="text-center">
        <p className="font-display text-2xl text-foreground">{cafeName}</p>
        <p className="mt-1 text-xs uppercase tracking-widest text-muted">Receipt</p>
      </header>

      <div className="mt-5 border-t border-dashed border-muted/40 pt-4 text-center">
        <p className="font-display text-3xl text-foreground">{receipt.orderNumber}</p>
        <p className="mt-1 text-xs text-muted">{placed}</p>
      </div>

      <ul className="mt-4 flex flex-col divide-y divide-muted/10 border-y border-dashed border-muted/40">
        {receipt.items.map((item) => (
          <li key={item.name} className="flex items-center justify-between py-2 text-sm">
            <span className="text-foreground">
              {item.name} × {item.qty}
            </span>
            <span className="text-muted">{formatINR(item.lineTotal)}</span>
          </li>
        ))}
      </ul>

      <div className="mt-3 flex items-center justify-between text-sm">
        <span className="text-muted">Total</span>
        <span className="font-medium text-foreground">{formatINR(receipt.total)}</span>
      </div>

      <div className="mt-4 flex items-center justify-between rounded-card border border-muted/30 px-4 py-3 text-sm">
        <span className={paid ? "text-success" : "text-accent"}>{receipt.paymentLabel}</span>
        <span className="text-muted">
          {dineIn
            ? `Dine-in${receipt.tableNumber ? ` · Table ${receipt.tableNumber}` : ""}`
            : "Pickup"}
        </span>
      </div>

      {dineIn && (
        <p className="mt-3 text-center text-sm text-accent">
          Show this receipt at the counter to confirm your table.
        </p>
      )}

      <footer className="mt-5 border-t border-dashed border-muted/40 pt-4 text-center text-xs text-muted">
        Thank you for visiting {cafeName}.
      </footer>
    </article>
  );
}
