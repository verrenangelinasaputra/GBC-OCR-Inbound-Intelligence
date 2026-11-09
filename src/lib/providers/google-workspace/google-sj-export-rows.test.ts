import { describe, expect, it } from "vitest";
import {
  buildGoogleSheetRows,
  buildSuratJalanDriveSubfolderName,
  buildSuratJalanFileName,
  nextOcrDataRowNumber,
  OCR_SHEET_HEADERS,
  recomputeOcrSheetLineStatus,
} from "./google-sj-export-rows";

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

  it("formats supplier portal Drive name with gudang", () => {
    expect(
      buildSuratJalanFileName({
        tanggal: "09/11/2026",
        noSuratJalan: "SJ00123",
        ext: ".jpg",
        supplierName: "PT Maju Jaya",
        gudang: "Gudang Karanggan",
      })
    ).toBe("SJ_20261109_PT Maju Jaya_SJ00123_Gudang Karanggan.jpg");
  });

  it("appends batch index when multiple images in one submit", () => {
    expect(
      buildSuratJalanFileName({
        tanggal: "09/11/2026",
        noSuratJalan: "SJ00123",
        ext: ".jpg",
        supplierName: "PT Maju Jaya",
        gudang: "Gudang Pusat",
        batchIndex: 2,
        batchTotal: 3,
      })
    ).toBe("SJ_20261109_PT Maju Jaya_SJ00123_Gudang Pusat (2).jpg");
  });
});

describe("buildSuratJalanDriveSubfolderName", () => {
  it("uses ISO date and SJ number", () => {
    expect(
      buildSuratJalanDriveSubfolderName({
        tanggal: "17/10/2023",
        noSuratJalan: "SG072236",
        supplierName: "PT Maju Jaya",
      })
    ).toBe("2023-10-17 - SG072236 - PT Maju Jaya");
  });
});

describe("buildGoogleSheetRows", () => {
  it("emits one row per item with 18 columns", () => {
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
      gudang: "Gudang Karanggan",
      kendaraanDriver: "Pak Budi",
      catatan: "Urgent",
      exportedAt: new Date("2026-10-03T12:00:00+07:00"),
    });
    expect(rows).toHaveLength(1);
    expect(rows[0]).toHaveLength(18);
    expect(rows[0][0]).toBe("Gudang Karanggan");
    expect(rows[0][3]).toBe("SG071351");
    expect(rows[0][8]).toBe("116 DUS");
    expect(rows[0][9]).toBe("144 PCS");
    expect(rows[0][11]).toBe("16704 PCS");
    expect(rows[0][15]).toBe("Pak Budi");
    expect(rows[0][16]).toBe("Urgent");
    expect(rows[0][17]).toBe("OK");
  });
});

describe("nextOcrDataRowNumber", () => {
  it("starts after header when sheet is empty", () => {
    expect(nextOcrDataRowNumber([Array.from(OCR_SHEET_HEADERS)])).toBe(2);
  });

  it("ignores junk rows that only fill Status", () => {
    const rows = [
      Array.from(OCR_SHEET_HEADERS),
      buildGoogleSheetRows({
        payload: { no_surat_jalan: "P7461", items: [{ nama_barang: "X", is_subtotal: false, ragu: false }] },
        fileName: "f.jpeg",
        fileUrl: "",
      })[0],
      ["", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "07/11/2026"],
    ];
    expect(nextOcrDataRowNumber(rows)).toBe(3);
  });
});

describe("recomputeOcrSheetLineStatus", () => {
  it("flags qty mismatch as CEK", () => {
    expect(
      recomputeOcrSheetLineStatus({
        banyaknya: "116 DUS",
        isi: "144 PCS",
        jumlah: "1 PCS",
        namaBarang: "TEH",
      })
    ).toBe("CEK");
  });
});
