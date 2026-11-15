import type { AppModule } from "@/lib/rbac/modules";
import type { SessionPayload } from "@/lib/auth/session";
import type { PortalAudience } from "@/lib/portal/audience";
import { portalAudienceFromPathname } from "@/lib/portal/paths";
import { PORTAL_NAV_OPERATIONS } from "@/lib/rbac/nav-modules";

const OPS = new Set(PORTAL_NAV_OPERATIONS.map((m) => m.module));

export type PortalModuleAccess = {
  gudang: AppModule[];
  customer: AppModule[];
  /** Gabungan (sidebar / redirect login). */
  union: AppModule[];
};

export function portalModulesFromCells(params: {
  legacy?: AppModule[] | null;
  gudang?: AppModule[] | null;
  customer?: AppModule[] | null;
}): PortalModuleAccess {
  const legacy = params.legacy ?? [];
  const gudang = params.gudang?.length ? params.gudang : legacy;
  const customer = params.customer?.length ? params.customer : legacy;
  const union = [...new Set([...gudang, ...customer])];
  return { gudang, customer, union };
}

export function allowedModulesForAudience(
  session: Pick<SessionPayload, "roles" | "allowedModules" | "allowedModulesGudang" | "allowedModulesCustomer">,
  audience: PortalAudience
): AppModule[] {
  if (session.roles.includes("SUPER_ADMIN")) return [...OPS];
  if (audience === "customer") {
    return session.allowedModulesCustomer ?? session.allowedModules ?? [];
  }
  return session.allowedModulesGudang ?? session.allowedModules ?? [];
}

export function allowedModulesForPathname(
  session: Pick<SessionPayload, "roles" | "allowedModules" | "allowedModulesGudang" | "allowedModulesCustomer">,
  pathname: string
): AppModule[] | null {
  if (session.roles.includes("SUPER_ADMIN")) return null;
  const audience = portalAudienceFromPathname(pathname);
  if (audience === "admin") {
    return session.allowedModules ?? [];
  }
  return allowedModulesForAudience(session, audience);
}

export function userHasPortalSectionAccess(
  session: Pick<SessionPayload, "roles" | "allowedModules" | "allowedModulesGudang" | "allowedModulesCustomer">,
  section: "gudang" | "customer" | "admin"
): boolean {
  if (session.roles.includes("SUPER_ADMIN")) return true;
  if (section === "admin") return false;
  const mods = allowedModulesForAudience(session, section);
  return mods.some((m) => OPS.has(m));
}