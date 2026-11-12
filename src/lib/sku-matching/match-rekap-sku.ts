import { productNameSimilarity, normalizeProductName } from "@/lib/sku-matching/text-similarity";
import type { SkuMatchSuggestion, SkuRekapEntry } from "@/lib/sku-matching/sku-rekap-types";
import type { MasterMappingEntry } from "@/lib/sku-matching/master-mapping-types";

function masterMappingMatches(
  query: string,
  mappings: MasterMappingEntry[]
): SkuMatchSuggestion[] {
  const nq = normalizeProductName(query);
  if (!nq) return [];
  const hits: SkuMatchSuggestion[] = [];
  for (const m of mappings) {
    const alias = normalizeProductName(m.namaBarangOcr);
    if (!alias) continue;
    if (alias === nq) {
      hits.push({
        rowNo: m.rowNo,
        skuLengkap: m.skuLengkap,
        namaInternalAccurate: m.namaInternalAccurate,
        namaProdukAcuan: m.namaProdukAcuan,
        kategoriUtama: m.kategoriUtama,
        skus: m.skus,
        barcode: m.barcode,
        sumberLembar: m.sumberLembar,
        score: 1,
        matchType: "exact",
      });
    }
  }
  return hits;
}

export function findTopRekapSkuMatches(
  namaBarangOcr: string,
  catalog: SkuRekapEntry[],
  limit = 3,
  masterMappings: MasterMappingEntry[] = []
): SkuMatchSuggestion[] {
  const query = namaBarangOcr.trim();
  if (!query) return [];

  const fromMaster = masterMappingMatches(query, masterMappings);
  if (fromMaster.length) {
    return fromMaster.slice(0, limit);
  }

  if (!catalog.length) return [];

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
