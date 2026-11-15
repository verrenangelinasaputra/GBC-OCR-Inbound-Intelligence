import { jsonError, requireSuperAdmin } from "@/lib/api/auth-context";
import { isSheetOnlyMode } from "@/lib/config/app-mode";
import { hasDatabase } from "@/lib/db";
import { deleteInternalUser, listInternalUsers, updateInternalUserAdmin } from "@/lib/internal-auth/directory";
import type { AppModule } from "@/lib/rbac/modules";
import { normalizeWarehouseGudangSelection } from "@/lib/config/supplier-gudang";
import { formatAllowedModulesCell } from "@/lib/rbac/nav-modules";

function sheetAdminEnabled(): boolean {
  return isSheetOnlyMode() || !hasDatabase();
}

export async function GET() {
  if (!sheetAdminEnabled()) {
    return jsonError(new Error("Hanya mode spreadsheet"), 404);
  }
  try {
    await requireSuperAdmin();
    const users = await listInternalUsers();
    const safe = users.map((u) => ({
      username: u.username,
      fullName: u.fullName,
      email: u.email,
      phone: u.phone,
      gudang: u.gudang,
      roles: u.roles,
      status: u.status,
      allowedModules: u.allowedModules,
      allowedModulesGudang: u.allowedModulesGudang,
      allowedModulesCustomer: u.allowedModulesCustomer,
      createdAt: u.createdAt,
    }));
    return Response.json({ users: safe });
  } catch (e) {
    return jsonError(e);
  }
}

export async function PATCH(request: Request) {
  if (!sheetAdminEnabled()) {
    return jsonError(new Error("Hanya mode spreadsheet"), 404);
  }
  try {
    await requireSuperAdmin();
    const body = await request.json();
    const username = String(body.username ?? "").trim().toLowerCase();
    if (!username) return jsonError(new Error("username wajib"), 400);

    const status = body.status !== undefined ? String(body.status).trim().toUpperCase() : undefined;
    let gudang: string | undefined;
    const gudangModules = Array.isArray(body.allowedModulesGudang)
      ? (body.allowedModulesGudang as unknown[]).map((m) => String(m).trim())
      : undefined;
    const customerModules = Array.isArray(body.allowedModulesCustomer)
      ? (body.allowedModulesCustomer as unknown[]).map((m) => String(m).trim())
      : undefined;

    if (body.gudang !== undefined) {
      try {
        const needsGudang = gudangModules === undefined ? true : gudangModules.length > 0;
        gudang = normalizeWarehouseGudangSelection(body.gudang, { allowEmpty: !needsGudang });
      } catch (e) {
        return jsonError(e);
      }
    }

    const roles =
      Array.isArray(body.roles) ? body.roles.map((r: unknown) => String(r).trim().toUpperCase()).filter(Boolean) : undefined;

    let allowedModules: AppModule[] | undefined;
    if (Array.isArray(body.allowedModules)) {
      allowedModules = body.allowedModules.map((m: unknown) => String(m).trim()) as AppModule[];
    }

    let allowedModulesGudang: AppModule[] | undefined;
    if (gudangModules) {
      allowedModulesGudang = gudangModules as AppModule[];
    }
    let allowedModulesCustomer: AppModule[] | undefined;
    if (customerModules) {
      allowedModulesCustomer = customerModules as AppModule[];
    }

    if (allowedModulesGudang || allowedModulesCustomer) {
      const g = allowedModulesGudang ?? [];
      const c = allowedModulesCustomer ?? [];
      if (!g.length && !c.length) {
        return jsonError(new Error("Pilih minimal satu halaman di section Gudang atau Customer."), 400);
      }
      if (g.length && !gudang) {
        return jsonError(new Error("Pilih minimal satu nama gudang untuk section Gudang."), 400);
      }
      allowedModules = formatAllowedModulesCell([...new Set([...g, ...c])])
        .split(";")
        .filter(Boolean) as AppModule[];
    }

    const updated = await updateInternalUserAdmin(username, {
      status,
      gudang,
      roles,
      allowedModules,
      allowedModulesGudang,
      allowedModulesCustomer,
    });

    return Response.json({
      ok: true,
      user: {
        username: updated.username,
        status: updated.status,
        gudang: updated.gudang,
        roles: updated.roles,
        allowedModules: updated.allowedModules,
        allowedModulesGudang: updated.allowedModulesGudang,
        allowedModulesCustomer: updated.allowedModulesCustomer,
      },
    });
  } catch (e) {
    return jsonError(e);
  }
}

export async function DELETE(request: Request) {
  if (!sheetAdminEnabled()) {
    return jsonError(new Error("Hanya mode spreadsheet"), 404);
  }
  try {
    const session = await requireSuperAdmin();
    const body = await request.json().catch(() => ({}));
    const username = String(body.username ?? "").trim().toLowerCase();
    if (!username) return jsonError(new Error("username wajib"), 400);

    await deleteInternalUser(username, session.username);
    return Response.json({ ok: true, deleted: username });
  } catch (e) {
    return jsonError(e);
  }
}
