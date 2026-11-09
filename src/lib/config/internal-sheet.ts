import { getCredentialsSpreadsheetId } from "./credentials-sheet";

export function getInternalSheetId(): string {
  return process.env.INTERNAL_SHEET_ID?.trim() || getCredentialsSpreadsheetId();
}

export function getInternalUsersTab(): string {
  return process.env.INTERNAL_SHEET_TAB?.trim() || "Sheet1";
}

/** Login admin/internal dari spreadsheet (tanpa Supabase). */
export function isInternalSheetAuthEnabled(): boolean {
  if (process.env.INTERNAL_SHEET_AUTH === "false") return false;
  if (process.env.SHEET_ONLY_MODE === "true") return true;
  if (process.env.INTERNAL_SHEET_ID?.trim()) return true;
  return !process.env.DATABASE_URL?.trim();
}
