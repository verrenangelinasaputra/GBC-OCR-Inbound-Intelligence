import { jsonError, requireApiSession } from "@/lib/api/auth-context";
import { hasPermission } from "@/lib/rbac/permissions";
import { isSheetOnlyMode } from "@/lib/config/app-mode";
import { hasDatabase } from "@/lib/db";
import {
  appendSupplierMasterDataRow,
  deleteSupplierMasterDataRow,
  loadSupplierMasterDataRows,
  updateSupplierMasterDataRow,
} from "@/lib/services/supplier-master-data-sheet";

function enabled(): boolean {
  return isSheetOnlyMode() || !hasDatabase();
}

function canWrite(session: Awaited<ReturnType<typeof requireApiSession>>): boolean {
  return (
    hasPermission(session.roles, "supplier_data_mapping", "CREATE", session.allowedModules) ||
    hasPermission(session.roles, "supplier_data_mapping", "EDIT", session.allowedModules)
  );
}

export async function GET() {
  if (!enabled()) return jsonError(new Error("Mode spreadsheet tidak aktif"), 404);
  try {
    const session = await requireApiSession();
    if (!hasPermission(session.roles, "supplier_data_mapping", "VIEW", session.allowedModules)) {
      return jsonError(new Error("FORBIDDEN"), 403);
    }
    const rows = await loadSupplierMasterDataRows(true);
    return Response.json({ rows });
  } catch (e) {
    return jsonError(e);
  }
}

export async function POST(request: Request) {
  if (!enabled()) return jsonError(new Error("Mode spreadsheet tidak aktif"), 404);
  try {
    const session = await requireApiSession();
    if (!canWrite(session)) return jsonError(new Error("FORBIDDEN"), 403);

    const body = await request.json();
    const tipeSupplier = String(body.tipeSupplier ?? "").trim();
    const kode = String(body.kode ?? "").trim();
    const namaSupplier = String(body.namaSupplier ?? "").trim();
    if (!kode || !namaSupplier) {
      return jsonError(new Error("Kode dan Nama Supplier wajib"), 400);
    }

    const saved = await appendSupplierMasterDataRow({ tipeSupplier, kode, namaSupplier });
    return Response.json({ ok: true, row: saved });
  } catch (e) {
    return jsonError(e);
  }
}

export async function PATCH(request: Request) {
  if (!enabled()) return jsonError(new Error("Mode spreadsheet tidak aktif"), 404);
  try {
    const session = await requireApiSession();
    if (!canWrite(session)) return jsonError(new Error("FORBIDDEN"), 403);

    const body = await request.json();
    const sheetRow = Number(body.sheetRow);
    if (!Number.isFinite(sheetRow) || sheetRow < 2) {
      return jsonError(new Error("sheetRow tidak valid"), 400);
    }

    const existing = (await loadSupplierMasterDataRows(true)).find((r) => r.sheetRow === sheetRow);
    if (!existing) return jsonError(new Error("Baris tidak ditemukan"), 404);

    const isSuperAdmin = session.roles.includes("SUPER_ADMIN");
    let kode = String(body.kode ?? existing.kode).trim();
    if (!isSuperAdmin && kode.toUpperCase() !== existing.kode.trim().toUpperCase()) {
      return jsonError(new Error("Hanya Super Admin yang dapat mengubah Kode supplier"), 403);
    }

    const tipeSupplier = String(body.tipeSupplier ?? existing.tipeSupplier).trim();
    const namaSupplier = String(body.namaSupplier ?? existing.namaSupplier).trim();
    if (!kode || !namaSupplier) {
      return jsonError(new Error("Kode dan Nama Supplier wajib"), 400);
    }

    const saved = await updateSupplierMasterDataRow(sheetRow, { tipeSupplier, kode, namaSupplier });
    return Response.json({ ok: true, row: saved });
  } catch (e) {
    return jsonError(e);
  }
}

export async function DELETE(request: Request) {
  if (!enabled()) return jsonError(new Error("Mode spreadsheet tidak aktif"), 404);
  try {
    const session = await requireApiSession();
    if (!canWrite(session)) return jsonError(new Error("FORBIDDEN"), 403);

    const body = await request.json();
    const sheetRow = Number(body.sheetRow);
    if (!Number.isFinite(sheetRow) || sheetRow < 2) {
      return jsonError(new Error("sheetRow tidak valid"), 400);
    }

    const rows = await deleteSupplierMasterDataRow(sheetRow);
    return Response.json({ ok: true, rows });
  } catch (e) {
    return jsonError(e);
  }
}
