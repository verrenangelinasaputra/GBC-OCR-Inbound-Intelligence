import { google } from "googleapis";
import { createGoogleAuthClient, resolveSheetTabName } from "@/lib/providers/google-workspace/client";
import { getGoogleExportConfigOptional } from "@/lib/providers/google-workspace";
import {
  normalizeOcrReviewStatus,
  pickDominantReviewStatus,
  type OcrReviewStatus,
} from "@/lib/ocr-review/workflow-status";
import { mapOcrSheetRow, ocrSheetFullColumnsRange } from "@/lib/providers/google-workspace/ocr-sheet-columns";
import { encodeOcrSheetDocKey, isMeaningfulOcrDataRow } from "@/lib/services/ocr-sheet-keys";

export type OcrSheetDocument = {
  docKey: string;
  exportTimestamp: string;
  tanggal: string;
  noSuratJalan: string;
  noKendaraan: string;
  fileName: string;
  fileUrl: string;
  lineCount: number;
  lineStatus: string;
  gudang: string;
  supplier: string;
  statusReview: OcrReviewStatus;
  tsKirimSupplier: string;
  tsDitinjauGudang: string;
  tsRevisiGudang: string;
  tsApproveGudang: string;
  tsKonfirmasiSupplier: string;
};

export async function listOcrDocumentsFromSheet(
  limit?: number,
  gudangFilter?: string[]
): Promise<OcrSheetDocument[]> {
  const maxRows = limit && limit > 0 ? limit : undefined;
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
  const map = new Map<
    string,
    OcrSheetDocument & { statuses: Set<string>; reviewStatuses: Set<OcrReviewStatus> }
  >();

  for (let i = 1; i < rows.length; i += 1) {
    const row = rows[i] ?? [];
    if (!isMeaningfulOcrDataRow(row)) continue;
    const fields = mapOcrSheetRow(row);
    const key = fields.fileName || `${fields.noSuratJalan}|${fields.tanggal}|${i}`;
    const existing = map.get(key);
    const status = fields.status || "OK";
    const review = normalizeOcrReviewStatus(fields.statusReview);
    if (existing) {
      existing.lineCount += 1;
      if (status) existing.statuses.add(status);
      existing.reviewStatuses.add(review);
      continue;
    }
    map.set(key, {
      docKey: encodeOcrSheetDocKey(key),
      exportTimestamp: fields.exportTimestamp,
      tanggal: fields.tanggal,
      noSuratJalan: fields.noSuratJalan,
      noKendaraan: fields.noKendaraan,
      fileName: fields.fileName,
      fileUrl: fields.fileUrl.startsWith("http") ? fields.fileUrl : "",
      lineCount: 1,
      lineStatus: status,
      gudang: fields.gudang,
      supplier: fields.supplier,
      statusReview: review,
      tsKirimSupplier: fields.tsKirimSupplier,
      tsDitinjauGudang: fields.tsDitinjauGudang,
      tsRevisiGudang: fields.tsRevisiGudang,
      tsApproveGudang: fields.tsApproveGudang,
      tsKonfirmasiSupplier: fields.tsKonfirmasiSupplier,
      statuses: new Set(status ? [status] : []),
      reviewStatuses: new Set([review]),
    });
  }

  let docs = Array.from(map.values()).map(({ statuses, reviewStatuses, ...doc }) => ({
    ...doc,
    lineStatus: statuses.has("CEK") ? "CEK" : doc.lineStatus,
    statusReview: pickDominantReviewStatus(reviewStatuses),
    fileUrl: doc.fileUrl.startsWith("http") ? doc.fileUrl : "",
  }));
  docs = docs.reverse();
  if (maxRows) docs = docs.slice(0, maxRows);

  if (gudangFilter?.length) {
    const set = new Set(gudangFilter);
    return docs.filter((d) => !d.gudang || set.has(d.gudang));
  }
  return docs;
}
