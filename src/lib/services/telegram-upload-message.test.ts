import { describe, expect, it } from "vitest";
import { buildTelegramUploadMessageText, formatTelegramBarangLines } from "./telegram-upload-message";

describe("telegram upload message", () => {
  it("formats barang lines from OCR payload", () => {
    const lines = formatTelegramBarangLines({
      items: [
        {
          nama_barang: "Teh Pucuk",
          jumlah_qty: 120,
          jumlah_satuan: "PCS",
          is_subtotal: false,
          ragu: false,
        },
        {
          nama_barang: "Subtotal",
          is_subtotal: true,
          ragu: false,
        },
      ],
    });
    expect(lines).toEqual(["1. TEH PUCUK — 120 PCS"]);
  });

  it("builds message with barang section", () => {
    const text = buildTelegramUploadMessageText({
      gudang: "Gudang Loumina",
      supplierName: "Perusahaan Testing",
      result: {
        submissionRef: "SJ-20261114-033710",
        suratJalanNumber: "SG072236",
        sheetRowCount: 2,
        sheetId: "x",
        sheetTab: "t",
        sheetUrl: "https://example.com/sheet",
        driveFileUrl: "https://drive.google.com/file/d/abc/view",
        ocrWarnings: [],
      },
      barangLines: ["1. TEH PUCUK — 120 PCS"],
    });
    expect(text).toContain("Gudang Loumina");
    expect(text).toContain("SG072236");
    expect(text).toContain("Foto Drive:");
    expect(text).toContain("Barang:");
    expect(text).toContain("TEH PUCUK");
    expect(text).not.toContain("Spreadsheet:");
  });
});