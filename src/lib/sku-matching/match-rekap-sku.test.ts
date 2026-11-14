import { describe, expect, it } from "vitest";
import { findTopRekapSkuMatches } from "@/lib/sku-matching/match-rekap-sku";
import type { SkuRekapEntry } from "@/lib/sku-matching/sku-rekap-types";

describe("findTopRekapSkuMatches", () => {
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