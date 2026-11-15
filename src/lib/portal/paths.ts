import type { PortalAudience } from "@/lib/portal/audience";

export function portalRoutePrefix(audience: PortalAudience): string {
  return audience === "customer" ? "/customer" : "";
}

/** Base path untuk halaman operasional (tanpa trailing slash). */
export function portalModuleHref(audience: PortalAudience, modulePath: string): string {
  const path = modulePath.startsWith("/") ? modulePath : `/${modulePath}`;
  const prefix = portalRoutePrefix(audience);
  return `${prefix}${path}`;
}

export function ocrReviewBaseFromPathname(pathname: string): string {
  return pathname.startsWith("/customer/") || pathname === "/customer"
    ? "/customer/ocr-review"
    : "/ocr-review";
}

export type PortalAudienceOrAdmin = PortalAudience | "admin";

export function portalAudienceFromPathname(pathname: string): PortalAudienceOrAdmin {
  if (pathname.startsWith("/customer/") || pathname === "/customer") return "customer";
  if (pathname === "/users" || pathname.startsWith("/users/")) return "admin";
  return "gudang";
}