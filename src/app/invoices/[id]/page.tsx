import { AppShell } from "@/components/layout/app-shell";
import { prisma } from "@/lib/db";

export default async function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const inv = await prisma.purchaseInvoice.findUniqueOrThrow({
    where: { id },
    include: {
      items: { include: { internalProduct: true } },
      purchaseOrder: { include: { document: true } },
      supplier: true,
    },
  });
  const terms = await prisma.paymentTerm.findMany();

  return (
    <AppShell title={`Invoice ${inv.invoiceNumber}`}>
      <p className="text-sm text-slate-600">
        {inv.supplier.name} · PP {inv.purchaseOrder.ppNumber} · SJ {inv.purchaseOrder.document.submissionRef}
      </p>
      <table className="mt-4 w-full text-sm border bg-white rounded-lg">
        <thead className="bg-slate-50">
          <tr>
            <th className="px-3 py-2 text-left">SKU</th>
            <th className="px-3 py-2 text-left">Qty</th>
            <th className="px-3 py-2 text-left">Harga SJ</th>
            <th className="px-3 py-2 text-left">Harga Master</th>
            <th className="px-3 py-2 text-left">Final</th>
          </tr>
        </thead>
        <tbody>
          {inv.items.map((i) => (
            <tr key={i.id} className="border-t">
              <td className="px-3 py-2">{i.internalProduct.sku}</td>
              <td className="px-3 py-2">{i.quantity.toString()}</td>
              <td className="px-3 py-2">{i.priceFromSuratJalan?.toString() ?? "—"}</td>
              <td className="px-3 py-2">{i.priceFromMaster?.toString() ?? "—"}</td>
              <td className="px-3 py-2">{i.priceFinal?.toString() ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {inv.status === "PENDING_VERIFICATION" && (
        <form action={`/api/invoices/${inv.id}/verify`} method="post" className="mt-6 flex gap-3 items-end">
          <div>
            <label className="text-sm">Payment term (konfirmasi user)</label>
            <select name="paymentTermCode" className="mt-1 block rounded border px-2 py-1 text-sm">
              <option value="">— Pilih —</option>
              {terms.map((t) => (
                <option key={t.id} value={t.code}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
          <button type="submit" className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white">
            Verify price & create AP
          </button>
        </form>
      )}
    </AppShell>
  );
}
