import { AppShell } from "@/components/layout/app-shell";
import { hasDatabase } from "@/lib/db";
import { getDashboardMetrics } from "@/lib/services/dashboard-metrics";
import { StatusBadge } from "@/components/ui/status-badge";

export default async function DashboardPage() {
  const metrics = await getDashboardMetrics();
  const spreadsheetMode = !hasDatabase();
  const cards = [
    { label: "Incoming shipments hari ini", value: metrics.cards.incomingToday, tone: "info" as const },
    { label: "Surat Jalan awaiting OCR", value: metrics.cards.awaitingOcr, tone: "warning" as const },
    { label: "Documents awaiting verification", value: metrics.cards.awaitingVerification, tone: "warning" as const },
    { label: "Unmatched product lines", value: metrics.cards.unmatchedLines, tone: "danger" as const },
    { label: "PP awaiting approval", value: metrics.cards.poAwaitingApproval, tone: "warning" as const },
    { label: "Goods awaiting receiving", value: metrics.cards.awaitingReceiving, tone: "info" as const },
    { label: "Open discrepancies", value: metrics.cards.openDiscrepancies, tone: "danger" as const },
    { label: "Invoices awaiting price verification", value: metrics.cards.invoicesAwaitingVerification, tone: "warning" as const },
  ];

  return (
    <AppShell title="Dashboard">
      {spreadsheetMode && (
        <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Mode spreadsheet — login admin dari Google Sheet. Data operasional Surat Jalan ada di spreadsheet
          export OCR; menu di bawah butuh Supabase jika ingin dipakai penuh.
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs text-slate-500">{c.label}</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">{c.value}</p>
            <div className="mt-2">
              <StatusBadge label="Live data" tone={c.tone} />
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="font-medium text-slate-900">Document processing status</h2>
          <ul className="mt-4 space-y-2 text-sm">
            {metrics.statusDistribution.length === 0 ? (
              <li className="text-slate-500">Belum ada dokumen — upload via Portal Supplier.</li>
            ) : (
              metrics.statusDistribution.map((s) => (
                <li key={s.status} className="flex justify-between border-b border-slate-100 py-2">
                  <span className="text-slate-600">{s.status.replace(/_/g, " ")}</span>
                  <span className="font-medium">{s._count._all}</span>
                </li>
              ))
            )}
          </ul>
        </section>
        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="font-medium text-slate-900">Inbound volume (14 hari)</h2>
          <p className="mt-2 text-3xl font-semibold text-blue-700">{metrics.shipmentsByDay.length}</p>
          <p className="text-sm text-slate-500">Total shipment records dalam periode</p>
        </section>
      </div>
    </AppShell>
  );
}
