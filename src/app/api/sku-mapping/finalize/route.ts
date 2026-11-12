import { jsonError, requireApiSession } from "@/lib/api/auth-context";
import { hasPermission } from "@/lib/rbac/permissions";
import { isSheetOnlyMode } from "@/lib/config/app-mode";
import { hasDatabase } from "@/lib/db";
import { getInternalUserProfile, userCanAccessGudang } from "@/lib/internal-auth/profile";
import { findTopRekapSkuMatches } from "@/lib/sku-matching/match-rekap-sku";
import type { SkuRekapEntry } from "@/lib/sku-matching/sku-rekap-types";
import { appendDbmInboundRow, listDbmFinalizedRowKeys } from "@/lib/services/dbm-inbound-sheet";
import { getSelesaiLineByRowKey } from "@/lib/services/ocr-sheet-sku-mapping";
import { getCatalogEntryByRowNo, loadSkuRekapCatalog } from "@/lib/services/sku-rekap-catalog";
import { loadMasterMappingEntries } from "@/lib/services/master-mapping-sheet";

function sheetSkuMappingEnabled(): boolean {
  return isSheetOnlyMode() || !hasDatabase();
}

export async function POST(request: Request) {
  if (!sheetSkuMappingEnabled()) {
    return jsonError(new Error("Mode spreadsheet tidak aktif"), 404);
  }

  try {
    const session = await requireApiSession();
    const canApprove =
      hasPermission(session.roles, "sku_mapping", "APPROVE", session.allowedModules) ||
      hasPermission(session.roles, "sku_mapping", "EDIT", session.allowedModules);
    if (!canApprove) {
      return jsonError(new Error("FORBIDDEN"), 403);
    }

    const profile = await getInternalUserProfile(session.username);
    const gudangFilter = profile?.gudangList.length ? profile.gudangList : undefined;

    const body = await request.json();
    const rowKey = String(body.rowKey ?? "").trim();
    const catalogRowNo = String(body.catalogRowNo ?? "").trim();
    if (!rowKey || !catalogRowNo) {
      return jsonError(new Error("rowKey dan catalogRowNo wajib"), 400);
    }

    const finalized = await listDbmFinalizedRowKeys();
    if (finalized.has(rowKey)) {
      return jsonError(new Error("Baris ini sudah menjadi final DBM"), 409);
    }

    const line = await getSelesaiLineByRowKey(rowKey, gudangFilter);
    if (!line) {
      return jsonError(new Error("Baris tidak ditemukan atau SJ belum terverifikasi / selesai"), 404);
    }

    if (gudangFilter?.length && !userCanAccessGudang(gudangFilter, line.gudang)) {
      return jsonError(new Error("FORBIDDEN"), 403);
    }

    const [catalog, masterMappings] = await Promise.all([
      loadSkuRekapCatalog(),
      loadMasterMappingEntries(),
    ]);
    let catalogEntry: SkuRekapEntry | null = getCatalogEntryByRowNo(catalog, catalogRowNo);
    if (!catalogEntry && catalogRowNo.startsWith("MM-")) {
      catalogEntry = masterMappings.find((m) => m.rowNo === catalogRowNo) ?? null;
    }
    if (!catalogEntry) {
      return jsonError(new Error("SKU rekap tidak ditemukan"), 400);
    }

    const suggestions = findTopRekapSkuMatches(line.namaBarang, catalog, 3, masterMappings);
    const allowed = suggestions.some((s) => s.rowNo === catalogEntry!.rowNo);
    if (!allowed) {
      return jsonError(new Error("Pilihan SKU harus dari rekomendasi (top match)"), 400);
    }

    const pick = suggestions.find((s) => s.rowNo === catalogEntry!.rowNo)!;

    await appendDbmInboundRow({
      line,
      catalog: catalogEntry,
      matchScore: pick.score,
      confirmedBy: profile?.fullName || session.username,
      linkSjDrive: line.fileUrl,
    });

    return Response.json({ ok: true, rowKey, catalogRowNo: catalogEntry.rowNo });
  } catch (e) {
    return jsonError(e);
  }
}
