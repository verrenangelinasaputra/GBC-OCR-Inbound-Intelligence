import "server-only";

import { isSupplierMasterUsername } from "@/lib/supplier-auth/master-admin";
import { listAllSupplierAccounts } from "@/lib/supplier-auth/directory";
import { resolveSupplierMasterMatch } from "@/lib/supplier-mapping/resolve-match";
import { loadSupplierMasterDataRows } from "@/lib/services/supplier-master-data-sheet";

export type SupplierMappingReviewRow = {
  username: string;
  supplierName: string;
  accountStatus: string;
  mappingStatus: "matched" | "unmatched";
  kode?: string;
  matchedAlias?: string;
};

export async function buildSupplierMappingReview(): Promise<SupplierMappingReviewRow[]> {
  const [accounts, catalog] = await Promise.all([
    listAllSupplierAccounts(),
    loadSupplierMasterDataRows(),
  ]);

  return accounts
    .filter((a) => !isSupplierMasterUsername(a.username))
    .map((account) => {
      const match = resolveSupplierMasterMatch(catalog, {
        supplierName: account.supplierName,
        supplierUsername: account.username,
      });
      return {
        username: account.username,
        supplierName: account.supplierName,
        accountStatus: account.status,
        mappingStatus: match ? "matched" : "unmatched",
        kode: match?.kode.trim() || undefined,
        matchedAlias: match?.namaSupplier.trim() || undefined,
      };
    })
    .sort((a, b) => a.supplierName.localeCompare(b.supplierName, "id"));
}
