import { AppShell } from "@/components/layout/app-shell";
import { SpreadsheetModePage, spreadsheetModeActive } from "@/components/layout/spreadsheet-mode-page";
import { SheetOcrReviewPanel } from "@/components/surat-jalan/sheet-ocr-review-panel";
import { getOcrSheetDocumentDetail } from "@/lib/services/ocr-sheet-detail";
import { markOcrDocumentOpened } from "@/lib/services/ocr-sheet-review";
import Link from "next/link";

export default async function OcrReviewSheetDetailPage({
  params,
}: {
  params: Promise<{ key: string }>;
}) {
  if (!spreadsheetModeActive()) {
    return (
      <AppShell title="OCR Review">
        <p className="text-slate-600">
          Detail mode spreadsheet hanya aktif tanpa database.{" "}
          <Link href="/ocr-review" className="text-blue-600 hover:underline">
            Kembali
          </Link>
        </p>
      </AppShell>
    );
  }

  const { key } = await params;
  try {
    await markOcrDocumentOpened(key).catch(() => null);
    const doc = await getOcrSheetDocumentDetail(key);
    return (
      <AppShell title={`OCR Review — ${doc.noSuratJalan || doc.fileName || "Surat Jalan"}`}>
        <SheetOcrReviewPanel docKey={key} initial={doc} />
      </AppShell>
    );
  } catch {
    return <SpreadsheetModePage title="OCR Review — tidak bisa baca sheet" />;
  }
}
