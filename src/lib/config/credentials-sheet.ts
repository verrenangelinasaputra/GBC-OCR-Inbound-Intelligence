/** Spreadsheet tunggal: akun supplier + warehouse internal (share Editor ke service account). */
export const DEFAULT_CREDENTIALS_SHEET_ID =
  "1CNmLX2Qca-9GxDJTh77W8VaVaDAcMchqj7tzeeYEyZw";

export const CREDENTIALS_SHEET_URL = `https://docs.google.com/spreadsheets/d/${DEFAULT_CREDENTIALS_SHEET_ID}/edit`;

export function getCredentialsSpreadsheetId(): string {
  return (
    process.env.CREDENTIALS_SHEET_ID?.trim() ||
    process.env.SUPPLIER_SHEET_ID?.trim() ||
    process.env.INTERNAL_SHEET_ID?.trim() ||
    DEFAULT_CREDENTIALS_SHEET_ID
  );
}
