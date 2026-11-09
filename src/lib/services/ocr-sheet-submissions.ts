import { google } from "googleapis";
import { createGoogleAuthClient, resolveSheetTabName } from "@/lib/providers/google-workspace/client";
import { getGoogleExportConfigOptional } from "@/lib/providers/google-workspace";
import {
  mapOcrSheetRow,
  ocrSheetFullColumnsRange,
  type OcrSheetRowFields,
} from "@/lib/providers/google-workspace/ocr-sheet-columns";
import { firstRowIsOcrHeader, isMeaningfulOcrDataRow } from "@/lib/services/ocr-sheet-keys";

export type SubmissionHistoryRow = OcrSheetRowFields & { rowKey: string };

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
    out.push({ ...fields, rowKey });
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
