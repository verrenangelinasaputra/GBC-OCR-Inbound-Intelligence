import { getWarehouseCredentialsSpreadsheetId } from "./credentials-sheet";

export function getInternalSheetId(): string {
  return process.env.INTERNAL_SHEET_ID?.trim() || getWarehouseCredentialsSpreadsheetId();
}

export function getInternalUsersTab(): string {
  return process.env.INTERNAL_SHEET_TAB?.trim() || "Users";
}

/** Login admin/internal dari spreadsheet (tanpa Supabase). */
export function isInternalSheetAuthEnabled(): boolean {
  if (process.env.INTERNAL_SHEET_AUTH === "false") return false;
  if (process.env.SHEET_ONLY_MODE === "true") return true;
  if (process.env.INTERNAL_SHEET_ID?.trim()) return true;
  return !process.env.DATABASE_URL?.trim();
}
