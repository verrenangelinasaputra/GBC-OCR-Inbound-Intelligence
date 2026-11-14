import { jsonError, requireSuperAdmin } from "@/lib/api/auth-context";
import { isSheetOnlyMode } from "@/lib/config/app-mode";
import { hasDatabase } from "@/lib/db";
import {
  deleteSupplierAccount,
  updateSupplierAccountAdmin,
  type SupplierAccountAdminPatch,
} from "@/lib/supplier-auth/directory";
import { isSupplierMasterUsername } from "@/lib/supplier-auth/master-admin";

function enabled(): boolean {
  return isSheetOnlyMode() || !hasDatabase();
}

export async function PATCH(request: Request) {
  if (!enabled()) return jsonError(new Error("Hanya mode spreadsheet"), 404);
  try {
    await requireSuperAdmin();
    const body = await request.json();
    const username = String(body.username ?? "").trim().toLowerCase();
    if (!username) return jsonError(new Error("username wajib"), 400);
    if (isSupplierMasterUsername(username)) {
      return jsonError(new Error("Akun master supplier tidak bisa diedit lewat UI ini"), 403);
    }

    const patch: SupplierAccountAdminPatch = {};
    if (body.supplierName !== undefined) patch.supplierName = String(body.supplierName).trim();
    if (body.contactName !== undefined) patch.contactName = String(body.contactName).trim();
    if (body.email !== undefined) patch.email = String(body.email).trim();
    if (body.phone !== undefined) patch.phone = String(body.phone).trim();
    if (body.status !== undefined) patch.status = String(body.status).trim().toUpperCase();

    const updated = await updateSupplierAccountAdmin(username, patch);
    return Response.json({
      ok: true,
      account: {
        username: updated.username,
        supplierName: updated.supplierName,
        contactName: updated.contactName,
        email: updated.email,
        phone: updated.phone,
        status: updated.status,
      },
    });
  } catch (e) {
    return jsonError(e);
  }
}

export async function DELETE(request: Request) {
  if (!enabled()) return jsonError(new Error("Hanya mode spreadsheet"), 404);
  try {
    await requireSuperAdmin();
    const body = await request.json().catch(() => ({}));
    const username = String(body.username ?? "").trim().toLowerCase();
    if (!username) return jsonError(new Error("username wajib"), 400);
    if (isSupplierMasterUsername(username)) {
      return jsonError(new Error("Akun master supplier tidak bisa dihapus"), 403);
    }

    await deleteSupplierAccount(username);
    return Response.json({ ok: true, deleted: username });
  } catch (e) {
    return jsonError(e);
  }
}
