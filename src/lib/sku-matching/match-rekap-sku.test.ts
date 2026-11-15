import { describe, expect, it } from "vitest";
import { findTopRekapSkuMatches } from "@/lib/sku-matching/match-rekap-sku";
import type { SkuRekapEntry } from "@/lib/sku-matching/sku-rekap-types";
import { productNameSimilarity } from "@/lib/sku-matching/text-similarity";

const base = (partial: Partial<SkuRekapEntry> & Pick<SkuRekapEntry, "rowNo">): SkuRekapEntry => ({
  skuLengkap: "",
  namaInternalAccurate: "",
  namaProdukAcuan: "",
  kategoriUtama: "PET",
  skus: "SKUS",
  barcode: "",
  sumberLembar: "PET",
  ...partial,
});

describe("productNameSimilarity", () => {
  it("nama acuan pendek BOTOL tidak dapat skor 92% terhadap nama SJ panjang", () => {
    const s = productNameSimilarity("BOTOL BR 250ML N24 HITAM M SS", "BOTOL");
    expect(s).toBeLessThan(0.7);
  });
});

describe("findTopRekapSkuMatches", () => {
  it("memprioritaskan baris dengan nama acuan lengkap dibanding BOTOL generik", () => {
    const ocr = "BOTOL BR 250ML N24 HITAM M SS";
    const catalog: SkuRekapEntry[] = [
      base({
        rowNo: "1",
        skuLengkap: "PETTA100N24PTHPSS",
        namaInternalAccurate: "PET Tabular 100ml N24 Putih P SS",
        namaProdukAcuan: "BOTOL",
      }),
      base({
        rowNo: "2",
        skuLengkap: "PETBR250N24HTMSS",
        namaInternalAccurate: "PET BR 250ml N24 Hitam M SS",
        namaProdukAcuan: "BOTOL BR 250ML N24 HITAM M SS",
      }),
    ];
    const top = findTopRekapSkuMatches(ocr, catalog, 3);
    expect(top[0]?.rowNo).toBe("2");
    expect(top[0]?.skuLengkap).toBe("PETBR250N24HTMSS");
  });

  it("bisa match lewat nama internal Accurate walaupun acuan pendek", () => {
    const ocr = "BOTOL BR 250ML N24 HITAM M SS";
    const catalog: SkuRekapEntry[] = [
      base({
        rowNo: "3",
        skuLengkap: "PETBR250N24HTMSS",
        namaInternalAccurate: "BOTOL BR 250ML N24 HITAM M SS",
        namaProdukAcuan: "BOTOL",
      }),
    ];
    const top = findTopRekapSkuMatches(ocr, catalog, 1);
    expect(top[0]?.matchType).toBe("exact");
    expect(top[0]?.rowNo).toBe("3");
  });

  it("tidak throw jika nama OCR atau field katalog undefined", () => {
    const catalog: SkuRekapEntry[] = [
      {
        rowNo: "1",
        skuLengkap: "SKU-1",
        namaInternalAccurate: "",
        namaProdukAcuan: "Botol PET 600",
        kategoriUtama: "PET",
        skus: "SKUS-1",
        barcode: "",
        sumberLembar: "PET",
      },
    ];
    expect(findTopRekapSkuMatches(undefined as unknown as string, catalog, 3)).toEqual([]);
    expect(findTopRekapSkuMatches("botol pet", catalog, 3).length).toBeGreaterThan(0);
    expect(
      findTopRekapSkuMatches("botol pet", [{ ...catalog[0]!, namaProdukAcuan: undefined as unknown as string }], 3)
    ).toEqual([]);
  });
});