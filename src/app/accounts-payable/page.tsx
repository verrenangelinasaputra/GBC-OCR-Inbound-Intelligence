import { ModuleListPage } from "@/components/layout/module-list-page";
import { prisma } from "@/lib/db";

export default async function AccountsPayablePage() {
  const rows = await prisma.accountsPayableRecord.findMany({
    include: { supplier: true, paymentTerm: true, invoice: true },
    orderBy: { createdAt: "desc" },
  });
  return (
    <ModuleListPage
      title="Accounts Payable"
      description="Persiapan hutang — eksekusi pembayaran di luar aplikasi (belum terintegrasi)."
    >
      <table className="min-w-full text-sm border rounded-xl bg-white">
        <thead className="bg-slate-50 text-left">
          <tr>
            <th className="px-3 py-2">AP No.</th>
            <th className="px-3 py-2">Supplier</th>
            <th className="px-3 py-2">Invoice</th>
            <th className="px-3 py-2">Amount</th>
            <th className="px-3 py-2">Outstanding</th>
            <th className="px-3 py-2">Term</th>
            <th className="px-3 py-2">Due</th>
            <th className="px-3 py-2">Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-t">
              <td className="px-3 py-2">{r.apNumber}</td>
              <td className="px-3 py-2">{r.supplier.name}</td>
              <td className="px-3 py-2">{r.invoiceReference}</td>
              <td className="px-3 py-2">{r.amount.toString()}</td>
              <td className="px-3 py-2">{r.outstanding.toString()}</td>
              <td className="px-3 py-2">{r.paymentTerm?.code ?? "—"}</td>
              <td className="px-3 py-2">{r.dueDate?.toLocaleDateString("id-ID") ?? "—"}</td>
              <td className="px-3 py-2">{r.paymentStatus}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </ModuleListPage>
  );
}
