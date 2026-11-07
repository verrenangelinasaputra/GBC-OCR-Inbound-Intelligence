import { google } from "googleapis";
import { createGoogleAuthClient } from "@/lib/providers/google-workspace/client";
import { getGoogleExportConfigOptional } from "@/lib/providers/google-workspace";

export type OcrSheetDocument = {
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
  const range = `${config.sheetTab}!A:O`;

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: config.sheetId,
    range,
  });

  const rows = res.data.values ?? [];
  const map = new Map<string, OcrSheetDocument & { statuses: Set<string> }>();

  for (let i = 1; i < rows.length; i += 1) {
    const row = rows[i] ?? [];
    const fileName = String(row[12] ?? "").trim();
    const fileUrl = String(row[13] ?? "").trim();
    const key = fileName || `${row[2] ?? ""}|${row[1] ?? ""}|${i}`;
    const existing = map.get(key);
    const status = String(row[14] ?? "").trim() || "OK";
    if (existing) {
      existing.lineCount += 1;
      if (status) existing.statuses.add(status);
      continue;
    }
    map.set(key, {
      exportTimestamp: String(row[0] ?? ""),
      tanggal: String(row[1] ?? ""),
      noSuratJalan: String(row[2] ?? ""),
      noKendaraan: String(row[3] ?? ""),
      fileName,
      fileUrl: fileUrl.startsWith("http") ? fileUrl : "",
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
