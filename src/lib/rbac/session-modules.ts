import "server-only";

import type { SessionPayload } from "@/lib/auth/session";
import type { PortalAudience } from "@/lib/portal/audience";
import { allowedModulesForAudience } from "@/lib/rbac/portal-module-access";

export function modulesForSession(
  session: SessionPayload | null | undefined,
  audience: PortalAudience
) {
  if (!session) return [];
  return allowedModulesForAudience(session, audience);
}