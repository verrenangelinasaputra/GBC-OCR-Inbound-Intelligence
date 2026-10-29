import { AppShell } from "@/components/layout/app-shell";
import { prisma } from "@/lib/db";
import { GoodsReceiptForm } from "@/components/receiving/goods-receipt-form";

export default async function PurchaseOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const po = await prisma.purchaseOrder.findUniqueOrThrow({
    where: { id },
    include: {
      supplier: true,
      document: true,
      items: { include: { internalProduct: true, ocrLineItem: true } },
      receipts: true,
      invoices: true,
    },
  });

  return (
    <AppShell title={`PP ${po.ppNumber}`}>
      <p className="text-sm text-slate-600">
        Supplier: {po.supplier.name} · SJ: {po.document.submissionRef} · Status: {po.status}
      </p>
      <table className="mt-4 w-full text-sm border rounded-lg bg-white overflow-hidden">
        <thead className="bg-slate-50">
          <tr>
            <th className="px-3 py-2 text-left">SKU</th>
            <th className="px-3 py-2 text-left">Deskripsi supplier</th>
            <th className="px-3 py-2 text-left">Qty PP</th>
            <th className="px-3 py-2 text-left">Unit</th>
          </tr>
        </thead>
        <tbody>
          {po.items.map((i) => (
            <tr key={i.id} className="border-t">
              <td className="px-3 py-2">{i.internalProduct.sku}</td>
              <td className="px-3 py-2">{i.supplierDescription}</td>
              <td className="px-3 py-2">{i.quantity.toString()}</td>
              <td className="px-3 py-2">{i.unit}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {po.status !== "APPROVED" && (
        <form action={`/api/purchase-orders/${po.id}/approve`} method="post" className="mt-4">
          <button type="submit" className="rounded-lg bg-emerald-600 px-4 py-2 text-sm text-white">
            Approve PP
          </button>
        </form>
      )}

      <a
        href={`/api/export/pp/${po.id}`}
        className="mt-4 inline-block text-sm text-blue-600 hover:underline"
      >
        Export CSV (Accurate-ready adapter — bukan sync API)
      </a>

      {po.status === "APPROVED" && (
        <div className="mt-8">
          <h2 className="font-medium">Penerimaan Barang</h2>
          <GoodsReceiptForm
            purchaseOrderId={po.id}
            items={po.items.map((i) => ({
              id: i.id,
              label: `${i.internalProduct.sku} — qty PP ${i.quantity.toString()}`,
            }))}
          />
        </div>
      )}

      {po.receipts.length > 0 && po.invoices.length === 0 && (
        <form action={`/api/invoices/prepare`} method="post" className="mt-6">
          <input type="hidden" name="purchaseOrderId" value={po.id} />
          <button type="submit" className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white">
            Prepare Purchase Invoice
          </button>
        </form>
      )}
    </AppShell>
  );
}
