/** Spreadsheet hasil OCR Surat Jalan (operasional GBC). */
export const GBC_OCR_RESULTS_SHEET_ID = "1o2No4lV_r1Hrfi3qiyKI0ZX-VUaQaZdcxCbo4qJ1LDc";

/** Folder Drive untuk foto Surat Jalan hasil upload. */
export const GBC_SURAT_JALAN_DRIVE_FOLDER_ID = "1_eQPA9BXJj1RjLgfyCPnlgZEsJdpjHnA";

export const GBC_OCR_RESULTS_SHEET_URL = `https://docs.google.com/spreadsheets/d/${GBC_OCR_RESULTS_SHEET_ID}/edit`;

export const GBC_SURAT_JALAN_DRIVE_FOLDER_URL = `https://drive.google.com/drive/folders/${GBC_SURAT_JALAN_DRIVE_FOLDER_ID}`;

export function getOcrExportSheetId(): string {
  return process.env.GOOGLE_SHEET_ID?.trim() || GBC_OCR_RESULTS_SHEET_ID;
}

export function getOcrExportDriveFolderId(): string {
  return process.env.GOOGLE_DRIVE_FOLDER_ID?.trim() || GBC_SURAT_JALAN_DRIVE_FOLDER_ID;
}

export function getOcrExportSheetTab(): string {
  return process.env.GOOGLE_SHEET_TAB?.trim() || "Sheet1";
}
