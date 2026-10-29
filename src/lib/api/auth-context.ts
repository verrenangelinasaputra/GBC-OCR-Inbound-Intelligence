import { getSession } from "@/lib/auth/session";
import { requirePermission } from "@/lib/rbac/permissions";
import type { AppModule } from "@/lib/rbac/modules";
import { PermissionAction } from "@prisma/client";

export async function requireApiSession() {
  const session = await getSession();
  if (!session) {
    throw new Error("UNAUTHORIZED");
  }
  return session;
}

export async function requireApiPermission(module: AppModule, action: PermissionAction) {
  const session = await requireApiSession();
  requirePermission(session.roles, module, action);
  return session;
}

export function jsonError(error: unknown, status = 400) {
  const message = error instanceof Error ? error.message : "Unknown error";
  const code =
    message === "UNAUTHORIZED" ? 401 : message === "FORBIDDEN" ? 403 : status;
  return Response.json({ error: message }, { status: code });
}
