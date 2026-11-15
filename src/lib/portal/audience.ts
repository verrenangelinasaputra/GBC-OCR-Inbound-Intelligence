import "server-only";

import { headers } from "next/headers";
import {
  SUPPLIER_CUSTOMER_DESTINATION,
  SUPPLIER_GUDANG_WAREHOUSE_OPTIONS,
} from "@/lib/config/supplier-gudang";

export type PortalAudience = "gudang" | "customer";

export async function getPortalAudience(): Promise<PortalAudience> {
  const h = await headers();
  return h.get("x-gbc-audience") === "customer" ? "customer" : "gudang";
}

/** Filter gudang tujuan untuk list OCR / DBM / SKU mapping. */
export function resolveGudangFilterForAudience(
  audience: PortalAudience,
  profileGudangs?: string[]
): string[] | undefined {
  const customer = SUPPLIER_CUSTOMER_DESTINATION;

  if (audience === "customer") {
    if (profileGudangs?.length) {
      return profileGudangs.includes(customer) ? [customer] : [];
    }
    return [customer];
  }

  if (profileGudangs?.length) {
    const warehouses = profileGudangs.filter((g) => g !== customer);
    return warehouses.length ? warehouses : undefined;
  }

  return [...SUPPLIER_GUDANG_WAREHOUSE_OPTIONS];
}

export function portalAudienceTitle(audience: PortalAudience): string {
  return audience === "customer" ? "Customer" : "Gudang";
}