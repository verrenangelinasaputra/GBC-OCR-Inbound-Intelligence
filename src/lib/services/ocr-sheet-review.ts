import { google } from "googleapis";
import {
  type OcrReviewStatus,
  DEFAULT_OCR_REVIEW_STATUS,
  normalizeOcrReviewStatus,
} from "@/lib/ocr-review/workflow-status";
import { createGoogleAuthClient, resolveSheetTabName } from "@/lib/providers/google-workspace/client";
import { getGoogleExportConfigOptional } from "@/lib/providers/google-workspace";
import { mapOcrSheetRow, ocrSheetFullColumnsRange, ocrSheetRowToValues } from "@/lib/providers/google-workspace/ocr-sheet-columns";
import {
  decodeOcrSheetDocKey,
  firstRowIsOcrHeader,
  sheetRowMatchesDocKey,
} from "@/lib/services/ocr-sheet-keys";

async function readMatrix() {
  const config = getGoogleExportConfigOptional();
  if (!config) throw new Error("Google export tidak dikonfigurasi");
  const auth = createGoogleAuthClient(config);
  const sheets = google.sheets({ version: "v4", auth });
  const sheetTab = await resolveSheetTabName(config);
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: config.sheetId,
    range: ocrSheetFullColumnsRange(sheetTab),
  });
  return { config, sheets, sheetTab, rows: res.data.values ?? [] };
}

export async function setOcrDocumentReviewStatus(params: {
  docKey: string;
  status: OcrReviewStatus;
  linkRevisi?: string;
}): Promise<void> {
  const rawKey = decodeOcrSheetDocKey(params.docKey);
  const { config, sheets, sheetTab, rows } = await readMatrix();
  const updates: { range: string; values: string[][] }[] = [];

  for (let i = 0; i < rows.length; i += 1) {
    if (i === 0 && firstRowIsOcrHeader(rows[i])) continue;
    const row = rows[i] ?? [];
    if (!sheetRowMatchesDocKey(row, rawKey)) continue;
    const fields = mapOcrSheetRow(row);
    fields.statusReview = params.status;
    if (params.linkRevisi !== undefined) fields.linkRevisi = params.linkRevisi;
    updates.push({
      range: `'${sheetTab.replace(/'/g, "''")}'!A${i + 1}:U${i + 1}`,
      values: [ocrSheetRowToValues(fields)],
    });
  }

  if (!updates.length) throw new Error("Dokumen tidak ditemukan di spreadsheet");

  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId: config.sheetId,
    requestBody: { valueInputOption: "RAW", data: updates },
  });
}

/** Buka detail = ditinjau (hanya dari BELUM → SUDAH). */
export async function markOcrDocumentOpened(docKey: string): Promise<void> {
  const rawKey = decodeOcrSheetDocKey(docKey);
  const { rows } = await readMatrix();
  let needs = false;
  for (let i = 1; i < rows.length; i += 1) {
    const row = rows[i] ?? [];
    if (!sheetRowMatchesDocKey(row, rawKey)) continue;
    if (mapOcrSheetRow(row).statusReview === DEFAULT_OCR_REVIEW_STATUS) needs = true;
  }
  if (needs) await setOcrDocumentReviewStatus({ docKey, status: "SUDAH_DITINJAU" });
}
