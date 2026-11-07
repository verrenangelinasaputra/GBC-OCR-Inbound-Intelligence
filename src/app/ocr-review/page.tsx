import { ModuleListPage } from "@/components/layout/module-list-page";
import { SpreadsheetModePage, spreadsheetModeActive } from "@/components/layout/spreadsheet-mode-page";
import { SheetExportTable } from "@/components/surat-jalan/sheet-export-table";
import { prisma } from "@/lib/db";
import { listOcrDocumentsFromSheet } from "@/lib/services/ocr-sheet-list";
import Link from "next/link";
import { StatusBadge } from "@/components/ui/status-badge";

export default async function OcrReviewPage() {
  if (spreadsheetModeActive()) {
    let docs: Awaited<ReturnType<typeof listOcrDocumentsFromSheet>> = [];
    try {
      const all = await listOcrDocumentsFromSheet();
      docs = all.filter((d) => d.lineStatus === "CEK");
      if (docs.length === 0) docs = all;
    } catch {
      return <SpreadsheetModePage title="OCR Review Queue" />;
    }
    return (
      <ModuleListPage
        title="OCR Review Queue"
        description="Mode spreadsheet — baris status CEK dari sheet export OCR (atau semua jika tidak ada CEK)."
      >
        <SheetExportTable docs={docs} />
      </ModuleListPage>
    );
  }

  const docs = await prisma.suratJalanDocument.findMany({
    where: { status: { in: ["NEEDS_REVIEW", "OCR_COMPLETED", "PROCESSING"] } },
    include: { supplier: true, ocrJobs: { take: 1, orderBy: { createdAt: "desc" } } },
    orderBy: { updatedAt: "desc" },
  });
  return (
    <ModuleListPage title="OCR Review Queue" description="Koreksi hasil OCR — raw output tetap tersimpan terpisah.">
      <ul className="space-y-3">
        {docs.map((d) => {
          const demo = (d.ocrJobs[0]?.structuredOutput as { isDemo?: boolean } | null)?.isDemo;
          return (
            <li key={d.id} className="flex items-center justify-between rounded-lg border bg-white p-4">
              <div>
                <p className="font-medium">{d.submissionRef}</p>
                <p className="text-sm text-slate-500">{d.supplier.name}</p>
                {demo && <StatusBadge label="DEMO OCR" tone="warning" />}
              </div>
              <Link href={`/surat-jalan/${d.id}`} className="text-blue-600 hover:underline">
                Open review
              </Link>
            </li>
          );
        })}
        {docs.length === 0 && <p className="text-slate-500">Queue kosong.</p>}
      </ul>
    </ModuleListPage>
  );
}
