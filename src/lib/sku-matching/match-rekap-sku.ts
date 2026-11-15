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

const MIN_MATCH_SCORE = 0.35;

/** Pencocokan utama: kolom C REKAP — Nama Internal Accurate (lalu acuan, SKU). */
function bestFieldSimilarity(
  query: string,
  entry: Pick<SkuRekapEntry, "namaInternalAccurate" | "namaProdukAcuan" | "skuLengkap">
): { score: number; matchType: "exact" | "fuzzy"; internalScore: number } {
  const nq = normalizeProductName(query);
  if (!nq) return { score: 0, matchType: "fuzzy", internalScore: 0 };

  const internal = coerceSheetCell(entry.namaInternalAccurate);
  const acuan = coerceSheetCell(entry.namaProdukAcuan);
  const sku = coerceSheetCell(entry.skuLengkap);

  if (internal && normalizeProductName(internal) === nq) {
    return { score: 1, matchType: "exact", internalScore: 1 };
  }

  const internalScore = internal ? productNameSimilarity(query, internal) : 0;
  const acuanScore = acuan ? productNameSimilarity(query, acuan) : 0;
  const skuScore = sku ? productNameSimilarity(query, sku) : 0;

  const score = Math.max(internalScore, acuanScore, skuScore * 0.75);
  const matchType: "exact" | "fuzzy" =
    score >= 0.95 || internalScore >= 0.95 ? "exact" : "fuzzy";

  return { score, matchType, internalScore };
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
    const internal = coerceSheetCell(entry.namaInternalAccurate);
    const sku = coerceSheetCell(entry.skuLengkap);
    if (!acuan && !internal && !sku) continue;

    const { score, matchType } = bestFieldSimilarity(query, entry);
    if (score < MIN_MATCH_SCORE) continue;

    scored.push({
      rowNo: coerceSheetCell(entry.rowNo),
      skuLengkap: sku,
      namaInternalAccurate: internal,
      namaProdukAcuan: acuan || internal || sku,
      kategoriUtama: coerceSheetCell(entry.kategoriUtama),
      skus: coerceSheetCell(entry.skus),
      barcode: coerceSheetCell(entry.barcode),
      sumberLembar: coerceSheetCell(entry.sumberLembar),
      score,
      matchType,
    });
  }

  const tieDetail = (item: SkuMatchSuggestion) =>
    productNameSimilarity(query, item.namaInternalAccurate || item.namaProdukAcuan);

  return scored
    .sort(
      (a, b) =>
        b.score - a.score ||
        tieDetail(b) - tieDetail(a) ||
        normalizeProductName(b.namaProdukAcuan).length - normalizeProductName(a.namaProdukAcuan).length
    )
    .slice(0, limit);
}
