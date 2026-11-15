import type { PortalAudience } from "@/lib/portal/audience";

/** Portal Gudang vs Customer untuk API (fetch tidak membawa x-gbc-audience dari middleware). */
export function portalAudienceFromRequest(request: Request): PortalAudience {
  const explicit = request.headers.get("x-gbc-audience")?.trim().toLowerCase();
  if (explicit === "customer") return "customer";
  const ref = request.headers.get("referer") ?? "";
  try {
    const url = new URL(ref);
    if (url.pathname === "/customer" || url.pathname.startsWith("/customer/")) return "customer";
  } catch {
    /* ignore */
  }
  return "gudang";
}