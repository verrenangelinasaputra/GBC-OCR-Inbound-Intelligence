import { normalizeProductName, productNameSimilarity } from "@/lib/sku-matching/text-similarity";
import type { SupplierMasterDataRow } from "@/lib/supplier-mapping/types";
import { sanitizeDriveFileSegment } from "@/lib/supplier-mapping/drive-label";

const MATCH_THRESHOLD = 0.85;

function hintsFromParams(params: { supplierName?: string; supplierUsername?: string }): string[] {
  const raw = [params.supplierName, params.supplierUsername]
    .map((s) => String(s ?? "").trim())
    .filter(Boolean);
  return [...new Set(raw)];
}

export function canonicalNamaForKode(
  catalog: SupplierMasterDataRow[],
  kode: string
): string {
  const key = kode.trim().toUpperCase();
  const hit = catalog.find((r) => r.kode.trim().toUpperCase() === key);
  return hit?.namaSupplier.trim() ?? "";
}

export function buildSupplierDriveFolderLabel(
  catalog: SupplierMasterDataRow[],
  row: SupplierMasterDataRow
): string {
  const kode = row.kode.trim();
  const nama =
    canonicalNamaForKode(catalog, kode) || row.namaSupplier.trim();
  const left = sanitizeDriveFileSegment(kode);
  const right = sanitizeDriveFileSegment(nama);
  if (!left || !right) return "";
  return `${left} - ${right}`;
}

export function resolveSupplierMasterMatch(
  catalog: SupplierMasterDataRow[],
  params: { supplierName?: string; supplierUsername?: string }
): SupplierMasterDataRow | null {
  const hints = hintsFromParams(params);
  if (!hints.length || !catalog.length) return null;

  for (const hint of hints) {
    const nq = normalizeProductName(hint);
    if (!nq) continue;

    for (const row of catalog) {
      const alias = normalizeProductName(row.namaSupplier);
      if (!alias) continue;
      if (nq === alias) return row;
      if (productNameSimilarity(hint, row.namaSupplier) >= MATCH_THRESHOLD) return row;
    }

    const byUsername = catalog.find(
      (r) => normalizeProductName(r.namaSupplier) === nq
    );
    if (byUsername) return byUsername;
  }

  return null;
}
