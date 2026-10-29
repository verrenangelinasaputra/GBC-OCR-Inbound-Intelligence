import { ModuleListPage } from "@/components/layout/module-list-page";
import { prisma } from "@/lib/db";
import Link from "next/link";

export default async function NkbPage() {
  const shipments = await prisma.inboundShipment.findMany({
    orderBy: { submittedAt: "desc" },
    include: { supplier: true, documents: true },
    take: 50,
  });
  return (
    <ModuleListPage title="Incoming Shipments / NKB" description="Notifikasi Kedatangan Barang — shipment inbound.">
      <div className="overflow-hidden rounded-xl border bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left">
            <tr>
              <th className="px-4 py-3">NKB Ref</th>
              <th className="px-4 py-3">Supplier</th>
              <th className="px-4 py-3">Waktu</th>
              <th className="px-4 py-3">Dokumen</th>
            </tr>
          </thead>
          <tbody>
            {shipments.map((s) => (
              <tr key={s.id} className="border-t">
                <td className="px-4 py-3 font-medium">{s.referenceNumber}</td>
                <td className="px-4 py-3">{s.supplier.name}</td>
                <td className="px-4 py-3">{s.submittedAt.toLocaleString("id-ID")}</td>
                <td className="px-4 py-3">
                  {s.documents.map((d) => (
                    <Link key={d.id} href={`/surat-jalan/${d.id}`} className="mr-2 text-blue-600">
                      {d.submissionRef}
                    </Link>
                  ))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ModuleListPage>
  );
}
