import { jsonError, requireSuperAdmin } from "@/lib/api/auth-context";
import { isSheetOnlyMode } from "@/lib/config/app-mode";
import { hasDatabase } from "@/lib/db";
import { buildSupplierMappingReview } from "@/lib/services/supplier-mapping-review";

function enabled(): boolean {
  return isSheetOnlyMode() || !hasDatabase();
}

export async function GET() {
  if (!enabled()) return jsonError(new Error("Hanya mode spreadsheet"), 404);
  try {
    await requireSuperAdmin();
    const rows = await buildSupplierMappingReview();
    const matched = rows.filter((r) => r.mappingStatus === "matched").length;
    return Response.json({ rows, summary: { total: rows.length, matched, unmatched: rows.length - matched } });
  } catch (e) {
    return jsonError(e);
  }
}
