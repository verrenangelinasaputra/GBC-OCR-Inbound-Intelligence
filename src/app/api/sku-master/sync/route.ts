import { jsonError, requireApiSession } from "@/lib/api/auth-context";
import { hasPermission } from "@/lib/rbac/permissions";
import { skuMasterApiEnabled } from "@/lib/sku-master/api-enabled";
import { syncSkuMasterMirrorFromSpreadsheet } from "@/lib/services/sku-master-sync";

export async function POST() {
  if (!skuMasterApiEnabled()) return jsonError(new Error("Mode spreadsheet tidak aktif"), 404);
  try {
    const session = await requireApiSession();
    const canWrite =
      hasPermission(session.roles, "master_mapping", "CREATE", session.allowedModules) ||
      hasPermission(session.roles, "master_mapping", "EDIT", session.allowedModules);
    if (!canWrite) return jsonError(new Error("FORBIDDEN"), 403);

    const summary = await syncSkuMasterMirrorFromSpreadsheet();
    return Response.json({ ok: true, summary });
  } catch (e) {
    return jsonError(e);
  }
}