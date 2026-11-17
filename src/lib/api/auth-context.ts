import { headers } from "next/headers";
import { getSession } from "@/lib/auth/session";
import { requirePermission } from "@/lib/rbac/permissions";
import type { AppModule } from "@/lib/rbac/modules";
import { allowedModulesForAudience } from "@/lib/rbac/portal-module-access";
import { PermissionAction } from "@prisma/client";

export async function requireApiSession() {
  const session = await getSession();
  if (!session) {
    throw new Error("UNAUTHORIZED");
  }
  return session;
}

export async function apiAllowedModules(session: Awaited<ReturnType<typeof requireApiSession>>) {
  const h = await headers();
  const audience = h.get("x-gbc-audience") === "customer" ? "customer" : "gudang";
  return allowedModulesForAudience(session, audience);
}

export async function requireApiPermission(module: AppModule, action: PermissionAction) {
  const session = await requireApiSession();
  const h = await headers();
  const audience = h.get("x-gbc-audience") === "customer" ? "customer" : "gudang";
  const mods = allowedModulesForAudience(session, audience);
  requirePermission(session.roles, module, action, mods);
  return session;
}

/** OCR sheet: izin dari union modul Gudang + Customer (API path selalu `/api/...`, bukan `/customer/...`). */
export async function requireApiPermissionOcrReview(action: PermissionAction) {
  const session = await requireApiSession();
  const gudang = allowedModulesForAudience(session, "gudang");
  const customer = allowedModulesForAudience(session, "customer");
  const union = [...new Set([...gudang, ...customer])];
  requirePermission(session.roles, "ocr_review", action, union);
  return session;
}

export async function requireSuperAdmin() {
  const session = await requireApiSession();
  if (!session.roles.includes("SUPER_ADMIN")) {
    throw new Error("FORBIDDEN");
  }
  return session;
}

export function jsonError(error: unknown, status = 400) {
  const message = error instanceof Error ? error.message : "Unknown error";
  const code =
    message === "UNAUTHORIZED" ? 401 : message === "FORBIDDEN" ? 403 : status;
  return Response.json({ error: message }, { status: code });
}
