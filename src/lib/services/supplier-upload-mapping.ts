import "server-only";

import {
  buildSupplierDriveFolderLabel,
  resolveSupplierMasterMatch,
} from "@/lib/supplier-mapping/resolve-match";
import { loadSupplierMasterDataRows } from "@/lib/services/supplier-master-data-sheet";

export type SupplierUploadMapping = {
  kode: string;
  supplierFolderName: string;
  matchedNama: string;
};

export async function resolveSupplierUploadMapping(params: {
  supplierName?: string;
  supplierUsername?: string;
}): Promise<SupplierUploadMapping | null> {
  const catalog = await loadSupplierMasterDataRows();
  const match = resolveSupplierMasterMatch(catalog, params);
  if (!match?.kode.trim()) return null;
  const supplierFolderName = buildSupplierDriveFolderLabel(catalog, match);
  if (!supplierFolderName) return null;
  return {
    kode: match.kode.trim(),
    supplierFolderName,
    matchedNama: match.namaSupplier.trim(),
  };
}
