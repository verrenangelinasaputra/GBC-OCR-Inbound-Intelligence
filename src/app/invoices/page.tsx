import { ModuleListPage } from "@/components/layout/module-list-page";
import { prisma } from "@/lib/db";
import Link from "next/link";

export default async function InvoicesPage() {
  const invoices = await prisma.purchaseInvoice.findMany({
    include: { supplier: true, purchaseOrder: true },
    orderBy: { createdAt: "desc" },
  });
  return (
    <ModuleListPage title="Purchase Invoices" description="Verifikasi harga sebelum finalisasi.">
      <table className="min-w-full text-sm border rounded-xl bg-white">
        <thead className="bg-slate-50 text-left">
          <tr>
            <th className="px-4 py-2">Invoice</th>
            <th className="px-4 py-2">PP</th>
            <th className="px-4 py-2">Total</th>
            <th className="px-4 py-2">Status</th>
            <th className="px-4 py-2"></th>
          </tr>
        </thead>
        <tbody>
          {invoices.map((inv) => (
            <tr key={inv.id} className="border-t">
              <td className="px-4 py-2">{inv.invoiceNumber}</td>
              <td className="px-4 py-2">{inv.purchaseOrder.ppNumber}</td>
              <td className="px-4 py-2">{inv.totalAmount?.toString() ?? "—"}</td>
              <td className="px-4 py-2">{inv.status}</td>
              <td className="px-4 py-2">
                <Link href={`/invoices/${inv.id}`} className="text-blue-600">
                  Detail
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </ModuleListPage>
  );
}
