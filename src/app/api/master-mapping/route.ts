import { jsonError, requireApiSession } from "@/lib/api/auth-context";
import { hasPermission } from "@/lib/rbac/permissions";
import { isSheetOnlyMode } from "@/lib/config/app-mode";
import { hasDatabase } from "@/lib/db";
import {
  appendMasterMappingEntry,
  loadMasterMappingEntries,
} from "@/lib/services/master-mapping-sheet";

function enabled(): boolean {
  return isSheetOnlyMode() || !hasDatabase();
}

export async function GET() {
  if (!enabled()) return jsonError(new Error("Mode spreadsheet tidak aktif"), 404);
  try {
    const session = await requireApiSession();
    if (!hasPermission(session.roles, "master_mapping", "VIEW", session.allowedModules)) {
      return jsonError(new Error("FORBIDDEN"), 403);
    }
    const entries = await loadMasterMappingEntries(true);
    return Response.json({ entries });
  } catch (e) {
    return jsonError(e);
  }
}

export async function POST(request: Request) {
  if (!enabled()) return jsonError(new Error("Mode spreadsheet tidak aktif"), 404);
  try {
    const session = await requireApiSession();
    const canWrite =
      hasPermission(session.roles, "master_mapping", "CREATE", session.allowedModules) ||
      hasPermission(session.roles, "master_mapping", "EDIT", session.allowedModules);
    if (!canWrite) return jsonError(new Error("FORBIDDEN"), 403);

    const body = await request.json();
    const namaBarangOcr = String(body.namaBarangOcr ?? "").trim();
    const namaProdukAcuan = String(body.namaProdukAcuan ?? "").trim();
    const skuLengkap = String(body.skuLengkap ?? "").trim();
    if (!namaBarangOcr || (!namaProdukAcuan && !skuLengkap)) {
      return jsonError(new Error("Nama barang OCR dan (nama produk acuan atau SKU lengkap) wajib"), 400);
    }

    const saved = await appendMasterMappingEntry({
      namaBarangOcr,
      skuLengkap,
      namaInternalAccurate: String(body.namaInternalAccurate ?? "").trim(),
      namaProdukAcuan,
      kategoriUtama: String(body.kategoriUtama ?? "").trim(),
      skus: String(body.skus ?? "").trim(),
      barcode: String(body.barcode ?? "").trim(),
      addedBy: session.username,
    });

    return Response.json({ ok: true, entry: saved });
  } catch (e) {
    return jsonError(e);
  }
}
