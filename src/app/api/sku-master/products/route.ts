import { jsonError, requireApiSession } from "@/lib/api/auth-context";
import { hasPermission } from "@/lib/rbac/permissions";
import { skuMasterApiEnabled } from "@/lib/sku-master/api-enabled";
import { createSkuMasterProduct, updateSkuMasterProduct } from "@/lib/services/sku-master-sheet";
import type { SkuMasterProductUpdateInput } from "@/lib/sku-master/types";
import type { SkuMasterProductInput } from "@/lib/sku-master/types";
import { SHEET_QUOTA_USER_MESSAGE } from "@/lib/google-sheets/sheet-values";

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

    return Response.json({ ok: true, product: result });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown";
    if (message === SHEET_QUOTA_USER_MESSAGE) {
      return Response.json({ error: message }, { status: 429 });
    }
    return jsonError(e);
  }
}

export async function PATCH(request: Request) {
  if (!skuMasterApiEnabled()) return jsonError(new Error("Mode spreadsheet tidak aktif"), 404);
  try {
    const session = await requireApiSession();
    const canWrite =
      hasPermission(session.roles, "master_mapping", "CREATE", session.allowedModules) ||
      hasPermission(session.roles, "master_mapping", "EDIT", session.allowedModules);
    if (!canWrite) return jsonError(new Error("FORBIDDEN"), 403);

    const body = await request.json();
    const sheetRow = Number(body.sheetRow ?? 0);
    if (!sheetRow) return jsonError(new Error("sheetRow wajib"), 400);

    const input: SkuMasterProductUpdateInput = {
      sheetRow,
      oldSkuLengkap: String(body.oldSkuLengkap ?? "").trim(),
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

    const result = await updateSkuMasterProduct(input);
    return Response.json({ ok: true, product: result });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown";
    if (message === SHEET_QUOTA_USER_MESSAGE) {
      return Response.json({ error: message }, { status: 429 });
    }
    return jsonError(e);
  }
}