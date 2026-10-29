import { ModuleListPage } from "@/components/layout/module-list-page";
import { prisma } from "@/lib/db";

export default async function ReportsPage() {
  const [docCount, poCount, discCount] = await Promise.all([
    prisma.suratJalanDocument.count(),
    prisma.purchaseOrder.count(),
    prisma.discrepancy.count(),
  ]);
  return (
    <ModuleListPage title="Reports & Analytics" description="Metrik dari data aplikasi (bukan klaim pajak).">
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border bg-white p-4">
          <p className="text-xs text-slate-500">Total Surat Jalan</p>
          <p className="text-2xl font-semibold">{docCount}</p>
        </div>
        <div className="rounded-lg border bg-white p-4">
          <p className="text-xs text-slate-500">Total PP</p>
          <p className="text-2xl font-semibold">{poCount}</p>
        </div>
        <div className="rounded-lg border bg-white p-4">
          <p className="text-xs text-slate-500">Total discrepancies</p>
          <p className="text-2xl font-semibold">{discCount}</p>
        </div>
      </div>
      <p className="mt-6 text-sm text-slate-500">
        Export CSV/XLSX per modul tersedia sesuai permission (contoh: export PP).
      </p>
    </ModuleListPage>
  );
}
