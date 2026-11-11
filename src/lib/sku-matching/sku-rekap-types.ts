import type { SkuMappingLineRow } from "@/lib/sku-matching/sku-mapping-line";

export type SkuRekapEntry = {
  /** Id stabil = nomor baris pada tab REKAP SKUL. */
  rowNo: string;
  skuLengkap: string;
  namaInternalAccurate: string;
  namaProdukAcuan: string;
  kategoriUtama: string;
  skus: string;
  barcode: string;
  sumberLembar: string;
};

export type SkuMatchSuggestion = SkuRekapEntry & {
  score: number;
  matchType: "exact" | "fuzzy";
};

export type SkuMappingWorkbenchRow = {
  line: SkuMappingLineRow;
  suggestions: SkuMatchSuggestion[];
};
