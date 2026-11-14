import { jsonError, requireSuperAdmin } from "@/lib/api/auth-context";
import { isSheetOnlyMode } from "@/lib/config/app-mode";
import { hasDatabase } from "@/lib/db";
import { listSupplierAccountsWithDrive } from "@/lib/services/supplier-drive-admin-list";

function enabled(): boolean {
  return isSheetOnlyMode() || !hasDatabase();
}

export async function GET() {
  if (!enabled()) return jsonError(new Error("Hanya mode spreadsheet"), 404);
  try {
    await requireSuperAdmin();
    const suppliers = await listSupplierAccountsWithDrive();
    return Response.json({ ok: true, suppliers });
  } catch (e) {
    return jsonError(e);
  }
}