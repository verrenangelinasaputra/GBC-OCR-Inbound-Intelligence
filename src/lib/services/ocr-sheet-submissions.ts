import { google } from "googleapis";
import { createGoogleAuthClient, resolveSheetTabName } from "@/lib/providers/google-workspace/client";
import { getGoogleExportConfigOptional } from "@/lib/providers/google-workspace";
import {
  mapOcrSheetRow,
  ocrSheetFullColumnsRange,
  type OcrSheetRowFields,
} from "@/lib/providers/google-workspace/ocr-sheet-columns";
import { encodeOcrSheetDocKey, firstRowIsOcrHeader, isMeaningfulOcrDataRow } from "@/lib/services/ocr-sheet-keys";
import { parseRevisionLinks } from "@/lib/surat-jalan/revision-links";
import type { OcrReviewStatus } from "@/lib/ocr-review/workflow-status";
import { normalizeOcrReviewStatus } from "@/lib/ocr-review/workflow-status";

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
  return status === "TIDAK_SESUAI_KONFIRMASI" || status === "TERVERIFIKASI_DISETUJUI";
}

export async function listOcrSheetSubmissionRows(): Promise<SubmissionHistoryRow[]> {
  const config = getGoogleExportConfigOptional();
  if (!config) return [];

  const auth = createGoogleAuthClient(config);
  const sheets = google.sheets({ version: "v4", auth });
  const sheetTab = await resolveSheetTabName(config);
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: config.sheetId,
    range: ocrSheetFullColumnsRange(sheetTab),
  });

  const rows = res.data.values ?? [];
  const out: SubmissionHistoryRow[] = [];

  for (let i = 0; i < rows.length; i += 1) {
    const row = rows[i] ?? [];
    if (firstRowIsOcrHeader(row)) continue;
    if (!isMeaningfulOcrDataRow(row)) continue;
    const fields = mapOcrSheetRow(row);
    const rowKey = [
      fields.noSuratJalan,
      fields.tanggal,
      fields.namaBarang,
      fields.jumlah,
      String(i),
    ].join("|");
    out.push({
      ...fields,
      rowKey,
      docKey: encodeOcrSheetDocKey(submissionDocRawKey(fields)),
      revisionLinks: parseRevisionLinks(fields.linkRevisi),
      statusReview: normalizeOcrReviewStatus(fields.statusReview),
    });
  }

  return out.reverse();
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
