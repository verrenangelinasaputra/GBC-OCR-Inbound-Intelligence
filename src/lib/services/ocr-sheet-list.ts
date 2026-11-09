import { google } from "googleapis";
import { createGoogleAuthClient, resolveSheetTabName } from "@/lib/providers/google-workspace/client";
import { getGoogleExportConfigOptional } from "@/lib/providers/google-workspace";
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
};

export async function listOcrDocumentsFromSheet(limit = 80): Promise<OcrSheetDocument[]> {
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
  const map = new Map<string, OcrSheetDocument & { statuses: Set<string> }>();

  for (let i = 1; i < rows.length; i += 1) {
    const row = rows[i] ?? [];
    if (!isMeaningfulOcrDataRow(row)) continue;
    const fields = mapOcrSheetRow(row);
    const key = fields.fileName || `${fields.noSuratJalan}|${fields.tanggal}|${i}`;
    const existing = map.get(key);
    const status = fields.status || "OK";
    if (existing) {
      existing.lineCount += 1;
      if (status) existing.statuses.add(status);
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
      statuses: new Set(status ? [status] : []),
    });
  }

  const docs = Array.from(map.values())
    .map(({ statuses, ...doc }) => ({
      ...doc,
      lineStatus: statuses.has("CEK") ? "CEK" : doc.lineStatus,
      fileUrl: doc.fileUrl.startsWith("http") ? doc.fileUrl : "",
    }))
    .slice(-limit)
    .reverse();

  return docs;
}
