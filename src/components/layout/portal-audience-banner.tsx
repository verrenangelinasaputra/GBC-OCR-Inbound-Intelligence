import type { PortalAudience } from "@/lib/portal/audience";
import { portalAudienceTitle } from "@/lib/portal/audience";

export function PortalAudienceBanner({ audience }: { audience: PortalAudience }) {
  const isCustomer = audience === "customer";
  return (
    <p
      className={
        isCustomer
          ? "mb-4 rounded-lg border border-violet-200 bg-violet-50 px-4 py-2 text-sm text-violet-950"
          : "mb-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-800"
      }
    >
      Portal <strong>{portalAudienceTitle(audience)}</strong>
      {isCustomer
        ? " — Surat Jalan dengan tujuan Customer (kirim langsung ke customer, bukan gudang fisik GBC)."
        : " — Surat Jalan ke gudang GBC (bukan tujuan Customer)."}
    </p>
  );
}