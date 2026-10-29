import { AppShell } from "@/components/layout/app-shell";
import { prisma } from "@/lib/db";
import Link from "next/link";
import { StatusBadge } from "@/components/ui/status-badge";

export default async function SuratJalanListPage() {
  const docs = await prisma.suratJalanDocument.findMany({
    orderBy: { createdAt: "desc" },
    include: { supplier: true, shipment: true },
    take: 100,
  });

  return (
    <AppShell title="Surat Jalan Documents">
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-600">
            <tr>
              <th className="px-4 py-3">Referensi</th>
              <th className="px-4 py-3">Supplier</th>
              <th className="px-4 py-3">No. SJ</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">NKB</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {docs.map((d) => (
              <tr key={d.id} className="border-t">
                <td className="px-4 py-3 font-medium">{d.submissionRef}</td>
                <td className="px-4 py-3">{d.supplier.name}</td>
                <td className="px-4 py-3">{d.suratJalanNumber ?? "—"}</td>
                <td className="px-4 py-3">
                  <StatusBadge label={d.status.replace(/_/g, " ")} tone="info" />
                </td>
                <td className="px-4 py-3">{d.shipment.referenceNumber}</td>
                <td className="px-4 py-3">
                  <Link href={`/surat-jalan/${d.id}`} className="text-blue-600 hover:underline">
                    Review
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}
