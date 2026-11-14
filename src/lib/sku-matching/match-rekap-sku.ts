import { coerceSheetCell } from "@/lib/sku-matching/coerce-string";
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
    const alias = normalizeProductName(coerceSheetCell(m.namaBarangOcr));
    if (!alias) continue;
    if (alias === nq) {
      hits.push({
        rowNo: coerceSheetCell(m.rowNo),
        skuLengkap: coerceSheetCell(m.skuLengkap),
        namaInternalAccurate: coerceSheetCell(m.namaInternalAccurate),
        namaProdukAcuan: coerceSheetCell(m.namaProdukAcuan),
        kategoriUtama: coerceSheetCell(m.kategoriUtama),
        skus: coerceSheetCell(m.skus),
        barcode: coerceSheetCell(m.barcode),
        sumberLembar: coerceSheetCell(m.sumberLembar),
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
  const query = coerceSheetCell(namaBarangOcr);
  if (!query) return [];

  const fromMaster = masterMappingMatches(query, masterMappings);
  if (fromMaster.length) {
    return fromMaster.slice(0, limit);
  }

  if (!catalog.length) return [];

  const scored: SkuMatchSuggestion[] = [];

  for (const entry of catalog) {
    const acuan = coerceSheetCell(entry.namaProdukAcuan);
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

    scored.push({
      rowNo: coerceSheetCell(entry.rowNo),
      skuLengkap: coerceSheetCell(entry.skuLengkap),
      namaInternalAccurate: coerceSheetCell(entry.namaInternalAccurate),
      namaProdukAcuan: acuan,
      kategoriUtama: coerceSheetCell(entry.kategoriUtama),
      skus: coerceSheetCell(entry.skus),
      barcode: coerceSheetCell(entry.barcode),
      sumberLembar: coerceSheetCell(entry.sumberLembar),
      score,
      matchType,
    });
  }

  return scored
    .sort(
      (a, b) =>
        b.score - a.score ||
        coerceSheetCell(a.namaProdukAcuan).localeCompare(coerceSheetCell(b.namaProdukAcuan), "id")
    )
    .slice(0, limit);
}
