import type { OcrSheetDocument } from "@/lib/services/ocr-sheet-list";
import { parseSjTanggalParts } from "@/lib/surat-jalan/tanggal-sj";
import { docMatchesDashboardBucket } from "@/lib/ocr-review/dashboard-bucket";
import type { OcrReviewDashboardBucket } from "@/lib/ocr-review/workflow-status";

export function docMatchesSjYear(doc: OcrSheetDocument, year: number | undefined): boolean {
  if (!year) return true;
  const p = parseSjTanggalParts(doc.tanggal);
  return p?.year === year;
}

export function docMatchesSjMonth(doc: OcrSheetDocument, month: number | undefined): boolean {
  if (!month) return true;
  const p = parseSjTanggalParts(doc.tanggal);
  return p?.month === month;
}

export function filterOcrReviewDocs(
  docs: OcrSheetDocument[],
  filters: {
    gudang?: string;
    status?: OcrReviewDashboardBucket | null;
    year?: number;
    month?: number;
  }
): OcrSheetDocument[] {
  return docs.filter((d) => {
    if (filters.gudang && (d.gudang?.trim() || "") !== filters.gudang) return false;
    if (filters.status && !docMatchesDashboardBucket(d, filters.status)) return false;
    if (!docMatchesSjYear(d, filters.year)) return false;
    if (!docMatchesSjMonth(d, filters.month)) return false;
    return true;
  });
}

export function parseYearFilter(raw: string | undefined): number | undefined {
  const y = Number(String(raw ?? "").trim());
  if (!Number.isInteger(y) || y < 1900 || y > 2100) return undefined;
  return y;
}

export function parseMonthFilter(raw: string | undefined): number | undefined {
  const m = Number(String(raw ?? "").trim());
  if (!Number.isInteger(m) || m < 1 || m > 12) return undefined;
  return m;
}
