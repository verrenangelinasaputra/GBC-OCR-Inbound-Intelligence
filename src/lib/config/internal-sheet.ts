const DEFAULT_INTERNAL_SHEET_ID = "1PTxO6HbOccYn30g1l7SaGpGIcV0PBcuLmqzC3me5GYM";

export function getInternalSheetId(): string {
  return process.env.INTERNAL_SHEET_ID?.trim() || DEFAULT_INTERNAL_SHEET_ID;
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
