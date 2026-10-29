import { describe, expect, it } from "vitest";
import { buildGoogleSheetRows, buildSuratJalanFileName } from "./google-sj-export-rows";

describe("buildSuratJalanFileName", () => {
  it("formats like legacy Apps Script", () => {
    expect(
      buildSuratJalanFileName({
        tanggal: "21/09/2026",
        noSuratJalan: "SG071351",
        ext: ".jpeg",
      })
    ).toBe("Surat Jalan_21-09-2026_SG071351.jpeg");
  });
});

describe("buildGoogleSheetRows", () => {
  it("emits one row per item with 15 columns", () => {
    const rows = buildGoogleSheetRows({
      payload: {
        tanggal: "21/09/2026",
        no_surat_jalan: "SG071351",
        no_kendaraan: "B 9217 UT",
        nama_penerima: "BAPAK YULIANTO",
        alamat: "JL. KARANGGAN",
        items: [
          {
            nama_barang: "BOTOL KILAP 400 ML CLEAR",
            banyaknya_qty: 116,
            banyaknya_satuan: "DUS",
            isi_qty: 144,
            isi_satuan: "PCS",
            jumlah_qty: 16704,
            jumlah_satuan: "PCS",
            is_subtotal: false,
            ragu: false,
          },
        ],
      },
      fileName: "Surat Jalan_21-09-2026_SG071351.jpeg",
      fileUrl: "https://drive.google.com/file/d/abc/view",
      exportedAt: new Date("2026-10-03T12:00:00+07:00"),
    });
    expect(rows).toHaveLength(1);
    expect(rows[0]).toHaveLength(15);
    expect(rows[0][2]).toBe("SG071351");
    expect(rows[0][7]).toBe("116 DUS");
    expect(rows[0][8]).toBe("144 PCS");
    expect(rows[0][10]).toBe("16704 PCS");
    expect(rows[0][14]).toBe("OK");
  });
});
