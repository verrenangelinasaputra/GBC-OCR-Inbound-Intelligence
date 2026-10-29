"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function GoodsReceiptForm({
  purchaseOrderId,
  items,
}: {
  purchaseOrderId: string;
  items: { id: string; label: string }[];
}) {
  const router = useRouter();
  const [qty, setQty] = useState<Record<string, string>>({});
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const lines = items.map((i) => ({
      purchaseOrderItemId: i.id,
      qtyReceived: Number(qty[i.id] ?? 0),
    }));
    const res = await fetch("/api/goods-receipts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ purchaseOrderId, lines }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Gagal");
      return;
    }
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="mt-3 space-y-3 rounded-lg border bg-white p-4">
      {items.map((i) => (
        <div key={i.id} className="flex items-center gap-4 text-sm">
          <span className="flex-1">{i.label}</span>
          <label>
            Qty received
            <input
              type="number"
              step="any"
              className="ml-2 w-24 rounded border px-2 py-1"
              value={qty[i.id] ?? ""}
              onChange={(e) => setQty((q) => ({ ...q, [i.id]: e.target.value }))}
              required
            />
          </label>
        </div>
      ))}
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button type="submit" className="rounded bg-slate-800 px-4 py-2 text-sm text-white">
        Submit Goods Receipt
      </button>
    </form>
  );
}
