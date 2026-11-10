/** Spreadsheet akun warehouse / internal (`/login`, `/register`). */
export const DEFAULT_WAREHOUSE_CREDENTIALS_SHEET_ID =
  "1CNmLX2Qca-9GxDJTh77W8VaVaDAcMchqj7tzeeYEyZw";

/** Spreadsheet akun supplier (portal `/supplier/*`). */
export const DEFAULT_SUPPLIER_CREDENTIALS_SHEET_ID =
  "156m4HFAUnqubtCJumBJZ9BCCel_kNVcU_ZV9kHi4HtY";

export const WAREHOUSE_CREDENTIALS_SHEET_URL = `https://docs.google.com/spreadsheets/d/${DEFAULT_WAREHOUSE_CREDENTIALS_SHEET_ID}/edit`;

export function getWarehouseCredentialsSpreadsheetId(): string {
  return (
    process.env.CREDENTIALS_SHEET_ID?.trim() ||
    process.env.INTERNAL_SHEET_ID?.trim() ||
    DEFAULT_WAREHOUSE_CREDENTIALS_SHEET_ID
  );
}

export function getSupplierCredentialsSpreadsheetId(): string {
  return process.env.SUPPLIER_SHEET_ID?.trim() || DEFAULT_SUPPLIER_CREDENTIALS_SHEET_ID;
}

/** @deprecated gunakan getWarehouseCredentialsSpreadsheetId atau getSupplierCredentialsSpreadsheetId */
export function getCredentialsSpreadsheetId(): string {
  return getWarehouseCredentialsSpreadsheetId();
}

export const CREDENTIALS_SHEET_URL = WAREHOUSE_CREDENTIALS_SHEET_URL;
export const DEFAULT_CREDENTIALS_SHEET_ID = DEFAULT_WAREHOUSE_CREDENTIALS_SHEET_ID;
