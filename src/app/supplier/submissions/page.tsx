import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { StatusBadge } from "@/components/ui/status-badge";

export default async function SupplierSubmissionsPage() {
  const session = await getSession();
  if (!session?.supplierId) redirect("/supplier/login");

  const docs = await prisma.suratJalanDocument.findMany({
    where: { supplierId: session.supplierId },
    orderBy: { createdAt: "desc" },
    include: { shipment: true },
    take: 50,
  });

  return (
    <div>
      <h1 className="text-2xl font-semibold">Status Pengiriman</h1>
      <p className="text-sm text-slate-400">Hanya dokumen supplier Anda — tanpa harga internal GBC.</p>
      <div className="mt-6 overflow-hidden rounded-xl border border-slate-700">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-800 text-left text-slate-300">
            <tr>
              <th className="px-4 py-3">Referensi</th>
              <th className="px-4 py-3">NKB</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Tanggal</th>
            </tr>
          </thead>
          <tbody>
            {docs.map((d) => (
              <tr key={d.id} className="border-t border-slate-700">
                <td className="px-4 py-3">{d.submissionRef}</td>
                <td className="px-4 py-3">{d.shipment.referenceNumber}</td>
                <td className="px-4 py-3">
                  <StatusBadge label={d.status.replace(/_/g, " ")} tone="info" />
                </td>
                <td className="px-4 py-3">{d.createdAt.toLocaleString("id-ID")}</td>
              </tr>
            ))}
            {docs.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-slate-500">
                  Belum ada submission.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
