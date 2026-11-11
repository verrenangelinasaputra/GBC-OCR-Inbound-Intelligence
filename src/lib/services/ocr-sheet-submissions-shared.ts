import type { OcrSheetRowFields } from "@/lib/providers/google-workspace/ocr-sheet-columns";
import { normalizeOcrReviewStatus, type OcrReviewStatus } from "@/lib/ocr-review/workflow-status";

export type SubmissionHistoryRow = OcrSheetRowFields & {
  rowKey: string;
  docKey: string;
  revisionLinks: string[];
  statusReview: OcrReviewStatus;
};

export function submissionDocRawKey(fields: Pick<OcrSheetRowFields, "fileName" | "noSuratJalan" | "tanggal">): string {
  return fields.fileName?.trim() || `${fields.noSuratJalan}|${fields.tanggal}`;
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
