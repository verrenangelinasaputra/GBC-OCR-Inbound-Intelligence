import type { sheets_v4 } from "googleapis";

function quoteTab(tab: string): string {
  return `'${tab.replace(/'/g, "''")}'`;
}

/** Satu permintaan batchUpdate menggantikan clear + update (menghemat kuota 60 writes/menit). */
export async function replaceSheetRows(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  tab: string,
  rows: string[][],
  lastColumn: string,
  priorRowCount?: number
): Promise<void> {
  const colCount = lastColumn.charCodeAt(0) - 64;
  const n = Math.max(rows.length, 1);
  const data: sheets_v4.Schema$ValueRange[] = [
    {
      range: `${quoteTab(tab)}!A1:${lastColumn}${n}`,
      values: rows.length ? rows : [Array(colCount).fill("")],
    },
  ];
  const prev = priorRowCount ?? n;
  if (prev > n) {
    const blank = Array.from({ length: prev - n }, () => Array(colCount).fill(""));
    data.push({
      range: `${quoteTab(tab)}!A${n + 1}:${lastColumn}${prev}`,
      values: blank,
    });
  }
  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId,
    requestBody: {
      valueInputOption: "RAW",
      data,
    },
  });
}

export function sheetQuotaError(message: string): boolean {
  return /quota exceeded|rate limit|resource_exhausted|writes per minute|read requests per minute/i.test(
    message
  );
}

export const SHEET_QUOTA_USER_MESSAGE =
  "Kuota Google Sheets habis (baca/tulis per menit). Tunggu 1–2 menit, hindari refresh atau sync berulang, lalu coba lagi.";

export function mapSheetApiError(error: unknown): Error {
  const message = error instanceof Error ? error.message : String(error);
  if (sheetQuotaError(message)) {
    return new Error(SHEET_QUOTA_USER_MESSAGE);
  }
  return error instanceof Error ? error : new Error(message);
}
