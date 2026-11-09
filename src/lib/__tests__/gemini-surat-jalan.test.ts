import { describe, it, expect } from "vitest";
import {
  parseGeminiDateToIso,
  geminiPayloadToLineItems,
  resolveItemProductName,
  parseKoreksiFromKeterangan,
} from "@/lib/providers/ocr/gemini-surat-jalan";

describe("Gemini Surat Jalan parse", () => {
  it("parses dd/MM/yyyy", () => {
    expect(parseGeminiDateToIso("21/09/2026")).toBe("2026-09-21");
  });

  it("maps items excluding subtotal rows", () => {
    const lines = geminiPayloadToLineItems({
      items: [
        { nama_barang: "TEH A", jumlah_qty: 10, jumlah_satuan: "DUS", is_subtotal: false, ragu: false },
        { nama_barang: "", is_subtotal: true, ragu: false },
      ],
    });
    expect(lines).toHaveLength(1);
    expect(lines[0].supplierProductName).toBe("TEH A");
  });

  it("uses corrected product name when teks cetak dicoret differs", () => {
    const name = resolveItemProductName({
      nama_barang: "BOTOL BR 250ML N24 HITAM MSS",
      teks_cetak_dicoret: "BOTOL BR 250ML N24 PUTIH MSS",
      is_subtotal: false,
      ragu: false,
    });
    expect(name).toContain("HITAM");
    const lines = geminiPayloadToLineItems({
      items: [
        {
          nama_barang: "BOTOL BR 250ML N24 HITAM MSS",
          teks_cetak_dicoret: "BOTOL BR 250ML N24 PUTIH MSS",
          jumlah_qty: 8736,
          jumlah_satuan: "PCS",
          is_subtotal: false,
          ragu: false,
        },
      ],
    });
    expect(lines[0].supplierProductName).toContain("HITAM");
    expect(lines[0].extractionNotes).toMatch(/Koreksi tulisan/i);
  });

  it("fixes product name from keterangan when model left printed text in nama_barang", () => {
    const name = resolveItemProductName({
      nama_barang: "BOTOL BR 250ML N24 PUTIH MSS",
      keterangan: "Koreksi tulisan: BOTOL BR 250ML N24 PUTIH MSS → BOTOL BR 250ML N24 HITAM MSS",
      is_subtotal: false,
      ragu: false,
    });
    expect(name).toContain("HITAM");
    expect(name).not.toMatch(/\bPUTIH\b/);
    expect(parseKoreksiFromKeterangan("PUTIH → HITAM")?.toWord).toBe("HITAM");
  });
});
