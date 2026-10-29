import { describe, it, expect } from "vitest";
import { parseGeminiDateToIso, geminiPayloadToLineItems } from "@/lib/providers/ocr/gemini-surat-jalan";

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
});
