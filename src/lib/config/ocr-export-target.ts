/** Spreadsheet hasil OCR Surat Jalan (operasional GBC). */
export const GBC_OCR_RESULTS_SHEET_ID = "1o2No4lV_r1Hrfi3qiyKI0ZX-VUaQaZdcxCbo4qJ1LDc";

/** Folder Drive untuk foto Surat Jalan hasil upload. */
export const GBC_SURAT_JALAN_DRIVE_FOLDER_ID = "1_eQPA9BXJj1RjLgfyCPnlgZEsJdpjHnA";

export const GBC_OCR_RESULTS_SHEET_URL = `https://docs.google.com/spreadsheets/d/${GBC_OCR_RESULTS_SHEET_ID}/edit`;

export const GBC_SURAT_JALAN_DRIVE_FOLDER_URL = `https://drive.google.com/drive/folders/${GBC_SURAT_JALAN_DRIVE_FOLDER_ID}`;

/** Spreadsheet/folder uji lama — diabaikan agar data tidak salah tujuan. */
const LEGACY_OCR_SHEET_IDS = new Set([
  "1XDSWH-_uMnQ9gzpBsMG2O-4ofgj-ewpwE2aX5e5xmH8",
]);
const LEGACY_DRIVE_FOLDER_IDS = new Set([
  "180sc1T2ioc0Z9j3FZV0dmsckWjF5yHF4",
]);

export function getOcrExportSheetId(): string {
  const fromEnv = process.env.GOOGLE_SHEET_ID?.trim();
  if (!fromEnv || LEGACY_OCR_SHEET_IDS.has(fromEnv)) return GBC_OCR_RESULTS_SHEET_ID;
  return fromEnv;
}

export function getOcrExportDriveFolderId(): string {
  const fromEnv = process.env.GOOGLE_DRIVE_FOLDER_ID?.trim();
  if (!fromEnv || LEGACY_DRIVE_FOLDER_IDS.has(fromEnv)) return GBC_SURAT_JALAN_DRIVE_FOLDER_ID;
  return fromEnv;
}

export function ocrExportSheetUrl(sheetId = getOcrExportSheetId()): string {
  return `https://docs.google.com/spreadsheets/d/${sheetId}/edit`;
}

export function getOcrExportSheetTab(): string {
  return process.env.GOOGLE_SHEET_TAB?.trim() || "Sheet1";
}
