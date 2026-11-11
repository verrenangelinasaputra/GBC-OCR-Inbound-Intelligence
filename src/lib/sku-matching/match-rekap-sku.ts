import { productNameSimilarity, normalizeProductName } from "@/lib/sku-matching/text-similarity";
import type { SkuMatchSuggestion, SkuRekapEntry } from "@/lib/sku-matching/sku-rekap-types";

export function findTopRekapSkuMatches(
  namaBarangOcr: string,
  catalog: SkuRekapEntry[],
  limit = 3
): SkuMatchSuggestion[] {
  const query = namaBarangOcr.trim();
  if (!query || !catalog.length) return [];

  const scored: SkuMatchSuggestion[] = [];

  for (const entry of catalog) {
    const acuan = entry.namaProdukAcuan.trim();
    if (!acuan) continue;

    const nq = normalizeProductName(query);
    const na = normalizeProductName(acuan);

    let score = productNameSimilarity(query, acuan);
    let matchType: "exact" | "fuzzy" = score >= 0.95 ? "exact" : "fuzzy";

    if (nq === na) {
      score = 1;
      matchType = "exact";
    } else if (
      entry.skuLengkap &&
      normalizeProductName(entry.skuLengkap) === nq
    ) {
      score = 1;
      matchType = "exact";
    }

    if (score < 0.35) continue;

    scored.push({ ...entry, score, matchType });
  }

  return scored
    .sort((a, b) => b.score - a.score || a.namaProdukAcuan.localeCompare(b.namaProdukAcuan, "id"))
    .slice(0, limit);
}
