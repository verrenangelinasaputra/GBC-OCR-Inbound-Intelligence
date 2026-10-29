import { ModuleListPage } from "@/components/layout/module-list-page";
import { prisma } from "@/lib/db";

export default async function DiscrepanciesPage() {
  const rows = await prisma.discrepancy.findMany({
    include: { purchaseOrder: true },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return (
    <ModuleListPage title="Discrepancy Management" description="Selisih qty — bukti asli tidak ditimpa.">
      <table className="min-w-full text-sm border rounded-xl bg-white">
        <thead className="bg-slate-50 text-left">
          <tr>
            <th className="px-3 py-2">ID</th>
            <th className="px-3 py-2">PP</th>
            <th className="px-3 py-2">Expected</th>
            <th className="px-3 py-2">Actual</th>
            <th className="px-3 py-2">Diff</th>
            <th className="px-3 py-2">Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((d) => (
            <tr key={d.id} className="border-t">
              <td className="px-3 py-2">{d.discrepancyNumber}</td>
              <td className="px-3 py-2">{d.purchaseOrder.ppNumber}</td>
              <td className="px-3 py-2">{d.expectedQty.toString()}</td>
              <td className="px-3 py-2">{d.actualQty.toString()}</td>
              <td className="px-3 py-2">{d.differenceQty.toString()}</td>
              <td className="px-3 py-2">{d.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </ModuleListPage>
  );
}
