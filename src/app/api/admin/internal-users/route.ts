import { jsonError, requireSuperAdmin } from "@/lib/api/auth-context";
import { isSheetOnlyMode } from "@/lib/config/app-mode";
import { hasDatabase } from "@/lib/db";
import { listInternalUsers, updateInternalUserAdmin } from "@/lib/internal-auth/directory";
import { DEFAULT_APPROVED_USER_MODULES } from "@/lib/internal-auth/default-modules";
import type { AppModule } from "@/lib/rbac/modules";
import { normalizeGudangSelection } from "@/lib/config/supplier-gudang";

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
    if (body.gudang !== undefined) {
      try {
        gudang = normalizeGudangSelection(body.gudang);
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

    if (status === "ACTIVE" && (!allowedModules || allowedModules.length === 0)) {
      allowedModules = [...DEFAULT_APPROVED_USER_MODULES];
    }

    const updated = await updateInternalUserAdmin(username, {
      status,
      gudang,
      roles,
      allowedModules,
    });

    return Response.json({
      ok: true,
      user: {
        username: updated.username,
        status: updated.status,
        gudang: updated.gudang,
        roles: updated.roles,
        allowedModules: updated.allowedModules,
      },
    });
  } catch (e) {
    return jsonError(e);
  }
}
