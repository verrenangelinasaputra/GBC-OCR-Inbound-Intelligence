import { jsonError, requireApiSession } from "@/lib/api/auth-context";
import { hasPermission } from "@/lib/rbac/permissions";
import { skuMasterApiEnabled } from "@/lib/sku-master/api-enabled";
import { createSkuMasterProduct } from "@/lib/services/sku-master-sheet";
import type { SkuMasterProductInput } from "@/lib/sku-master/types";
import { syncSkuMasterMirrorFromSpreadsheet } from "@/lib/services/sku-master-sync";

export async function POST(request: Request) {
  if (!skuMasterApiEnabled()) return jsonError(new Error("Mode spreadsheet tidak aktif"), 404);
  try {
    const session = await requireApiSession();
    const canWrite =
      hasPermission(session.roles, "master_mapping", "CREATE", session.allowedModules) ||
      hasPermission(session.roles, "master_mapping", "EDIT", session.allowedModules);
    if (!canWrite) return jsonError(new Error("FORBIDDEN"), 403);

    const body = await request.json();
    const input: SkuMasterProductInput = {
      categoryTab: String(body.categoryTab ?? "").trim(),
      namaProdukAcuan: String(body.namaProdukAcuan ?? "").trim(),
      namaInternalAccurate: String(body.namaInternalAccurate ?? "").trim(),
      sub1: String(body.sub1 ?? "").trim(),
      sub2: String(body.sub2 ?? "").trim(),
      sub3: String(body.sub3 ?? "").trim(),
      sub4: String(body.sub4 ?? "").trim(),
      sub5: String(body.sub5 ?? "").trim(),
      sub6: String(body.sub6 ?? "").trim(),
      sub7: String(body.sub7 ?? "").trim(),
      sub8: String(body.sub8 ?? "").trim(),
      sub9: String(body.sub9 ?? "").trim(),
    };

    const result = await createSkuMasterProduct(input);
    const sync = await syncSkuMasterMirrorFromSpreadsheet();

    return Response.json({ ok: true, product: result, sync });
  } catch (e) {
    return jsonError(e);
  }
}