import { isSheetOnlyMode } from "@/lib/config/app-mode";
import { hasDatabase } from "@/lib/db";

/** Sama pola modul spreadsheet lain: aktif di pilot sheet-only atau tanpa DB penuh. */
export function skuMasterApiEnabled(): boolean {
  return isSheetOnlyMode() || !hasDatabase();
}