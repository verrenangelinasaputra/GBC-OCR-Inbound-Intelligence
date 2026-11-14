import type { OcrSheetRowFields } from "@/lib/providers/google-workspace/ocr-sheet-columns";
import { normalizeOcrReviewStatus, type OcrReviewStatus } from "@/lib/ocr-review/workflow-status";

export type SubmissionHistoryRow = OcrSheetRowFields & {
  rowKey: string;
  docKey: string;
  revisionLinks: string[];
  statusReview: OcrReviewStatus;
};

/** Satu submit/foto = satu kunci (prioritas link Drive — unik per file). */
export function submissionDocRawKey(
  fields: Pick<OcrSheetRowFields, "fileName" | "noSuratJalan" | "tanggal" | "fileUrl">
): string {
  const url = fields.fileUrl?.trim();
  if (url && url.startsWith("http")) return url;
  const name = fields.fileName?.trim();
  if (name) return name;
  return `${fields.noSuratJalan}|${fields.tanggal}`;
}

export function supplierCanConfirmReceipt(status: OcrReviewStatus): boolean {
  const s = normalizeOcrReviewStatus(status);
  return (
    s === "TERVERIFIKASI_DISETUJUI" ||
    s === "MENUNGGU_REVISI_SUPPLIER" ||
    s === "MEMERLUKAN_REVISI"
  );
}

export function filterRowsForSupplier(
  rows: SubmissionHistoryRow[],
  companyName: string,
  username: string
): SubmissionHistoryRow[] {
  const company = companyName.trim().toLowerCase();
  const user = username.trim().toLowerCase();
  if (!company && !user) return rows;
  return rows.filter((r) => {
    const s = r.supplier.trim().toLowerCase();
    return s === company || s === user || (company.length >= 2 && s.includes(company));
  });
}
