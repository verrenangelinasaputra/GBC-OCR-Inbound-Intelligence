import type { OcrSheetDocument } from "@/lib/services/ocr-sheet-list";
import { warehouseReviewWaitSortKey } from "@/lib/ocr-review/workflow-timeline";
import { parseSjTanggalParts } from "@/lib/surat-jalan/tanggal-sj";
import { docMatchesDashboardBucket } from "@/lib/ocr-review/dashboard-bucket";
import type { OcrReviewDashboardBucket } from "@/lib/ocr-review/workflow-status";

export type OcrReviewSortMode = "wait_review" | "tanggal_sj_desc" | "kirim_desc";

export function parseOcrReviewSort(raw: string | undefined): OcrReviewSortMode {
  const v = String(raw ?? "").trim();
  if (v === "tanggal_sj_desc" || v === "kirim_desc") return v;
  return "wait_review";
}

export function sortOcrReviewDocs(docs: OcrSheetDocument[], mode: OcrReviewSortMode): OcrSheetDocument[] {
  const list = [...docs];
  if (mode === "wait_review") {
    return list.sort((a, b) => {
      const wa = warehouseReviewWaitSortKey(a);
      const wb = warehouseReviewWaitSortKey(b);
      if (wa !== wb) return wb - wa;
      return (b.tsKirimSupplier || b.exportTimestamp).localeCompare(a.tsKirimSupplier || a.exportTimestamp);
    });
  }
  if (mode === "kirim_desc") {
    return list.sort((a, b) =>
      (b.tsKirimSupplier || b.exportTimestamp).localeCompare(a.tsKirimSupplier || a.exportTimestamp)
    );
  }
  return list.sort((a, b) => (b.tanggal || "").localeCompare(a.tanggal || ""));
}

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
