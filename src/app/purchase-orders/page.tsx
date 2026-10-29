import { ModuleListPage } from "@/components/layout/module-list-page";
import { prisma } from "@/lib/db";
import Link from "next/link";

export default async function PurchaseOrdersPage() {
  const orders = await prisma.purchaseOrder.findMany({
    include: { supplier: true, document: true },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return (
    <ModuleListPage title="Purchase Orders (PP)" description="Pesanan Pembelian — export Accurate via adapter (belum live API).">
      <table className="min-w-full text-sm border rounded-xl bg-white overflow-hidden">
        <thead className="bg-slate-50 text-left">
          <tr>
            <th className="px-4 py-3">PP No.</th>
            <th className="px-4 py-3">Supplier</th>
            <th className="px-4 py-3">Surat Jalan</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3"></th>
          </tr>
        </thead>
        <tbody>
          {orders.map((o) => (
            <tr key={o.id} className="border-t">
              <td className="px-4 py-3">{o.ppNumber}</td>
              <td className="px-4 py-3">{o.supplier.name}</td>
              <td className="px-4 py-3">{o.document.submissionRef}</td>
              <td className="px-4 py-3">{o.status}</td>
              <td className="px-4 py-3">
                <Link href={`/purchase-orders/${o.id}`} className="text-blue-600">
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
