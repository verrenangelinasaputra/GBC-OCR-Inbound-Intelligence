import type { OcrSheetDocument } from "@/lib/services/ocr-sheet-list";
import {
  supplierRevisionWaitMs,
  warehouseReviewWaitMs,
  warehouseVerifyWaitMs,
} from "@/lib/ocr-review/workflow-timeline";
import { parseSjTanggalParts } from "@/lib/surat-jalan/tanggal-sj";
import { docMatchesDashboardBucket } from "@/lib/ocr-review/dashboard-bucket";
import type { OcrReviewDashboardBucket } from "@/lib/ocr-review/workflow-status";
import { normalizeOcrReviewStatus, ocrReviewStatusLabel } from "@/lib/ocr-review/workflow-status";

export type OcrReviewColumnSortKey =
  | "wait_review"
  | "wait_verify"
  | "wait_supplier_confirm"
  | "tanggal"
  | "noSuratJalan"
  | "supplier"
  | "gudang"
  | "lineStatus"
  | "statusReview";

export type SortDir = "asc" | "desc";

function tanggalSortKey(tanggal: string): number {
  const p = parseSjTanggalParts(tanggal);
  if (!p) return 0;
  return p.year * 10_000 + p.month * 100 + p.day;
}

function compareWaitMs(a: number | null, b: number | null): number {
  const va = a ?? -1;
  const vb = b ?? -1;
  return va - vb;
}

function compareStrings(a: string, b: string): number {
  return a.localeCompare(b, "id", { sensitivity: "base" });
}

/** Urutkan dokumen OCR Review menurut kolom + arah. */
export function sortOcrReviewDocsByColumn(
  docs: OcrSheetDocument[],
  key: OcrReviewColumnSortKey,
  dir: SortDir
): OcrSheetDocument[] {
  const list = [...docs];
  const sign = dir === "asc" ? 1 : -1;

  list.sort((a, b) => {
    let cmp = 0;
    switch (key) {
      case "wait_review":
        cmp = compareWaitMs(warehouseReviewWaitMs(a), warehouseReviewWaitMs(b));
        break;
      case "wait_verify":
        cmp = compareWaitMs(warehouseVerifyWaitMs(a), warehouseVerifyWaitMs(b));
        break;
      case "wait_supplier_confirm":
        cmp = compareWaitMs(supplierRevisionWaitMs(a), supplierRevisionWaitMs(b));
        break;
      case "tanggal":
        cmp = tanggalSortKey(a.tanggal) - tanggalSortKey(b.tanggal);
        break;
      case "noSuratJalan":
        cmp = compareStrings(a.noSuratJalan || "", b.noSuratJalan || "");
        break;
      case "supplier":
        cmp = compareStrings(a.supplier || "", b.supplier || "");
        break;
      case "gudang":
        cmp = compareStrings(a.gudang || "", b.gudang || "");
        break;
      case "lineStatus":
        cmp = compareStrings(a.lineStatus || "", b.lineStatus || "");
        break;
      case "statusReview": {
        const la = ocrReviewStatusLabel(normalizeOcrReviewStatus(a.statusReview));
        const lb = ocrReviewStatusLabel(normalizeOcrReviewStatus(b.statusReview));
        cmp = compareStrings(la, lb);
        break;
      }
      default:
        cmp = 0;
    }
    if (cmp !== 0) return sign * cmp;
    return compareStrings(a.noSuratJalan || "", b.noSuratJalan || "");
  });

  return list;
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
