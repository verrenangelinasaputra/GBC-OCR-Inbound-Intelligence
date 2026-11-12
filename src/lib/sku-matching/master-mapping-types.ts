import type { SkuRekapEntry } from "@/lib/sku-matching/sku-rekap-types";

export type MasterMappingEntry = SkuRekapEntry & {
  namaBarangOcr: string;
  addedBy: string;
  addedAt: string;
};
