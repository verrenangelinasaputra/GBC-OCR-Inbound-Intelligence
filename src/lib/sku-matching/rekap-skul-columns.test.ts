import { describe, expect, it } from "vitest";
import { parseRekapSkulDataRow, rekapSkulColumnMap } from "@/lib/sku-matching/rekap-skul-columns";

describe("rekapSkulColumnMap", () => {
  it("memetakan kolom C ke Nama Internal Accurate", () => {
    const header = ["No", "SKU Lengkap", "Nama Internal Accurate", "Nama Produk Acuan", "Kategori", "SKUS"];
    const cols = rekapSkulColumnMap(header);
    const row = ["1", "PETBR250", "BOTOL BR 250ML N24 HITAM M SS", "BOTOL", "PET", "SKUS1"];
    const parsed = parseRekapSkulDataRow(row, 2, cols);
    expect(parsed?.namaInternalAccurate).toBe("BOTOL BR 250ML N24 HITAM M SS");
    expect(parsed?.namaProdukAcuan).toBe("BOTOL");
  });
});