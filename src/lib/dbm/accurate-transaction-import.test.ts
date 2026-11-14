import { describe, expect, it } from "vitest";
import { dbmRecordToAccurateRow, ACCURATE_TRANSACTION_ITEM_HEADERS } from "./accurate-transaction-import";
import type { DbmInboundRecord } from "./dbm-inbound-types";

const base: DbmInboundRecord = {
  exportedAt: "01/01/2026",
  confirmedBy: "admin",
  gudang: "Gudang Loumina",
  supplier: "PT Test",
  tanggalSj: "14/11/2026",
  noSj: "SG072236",
  namaBarangOcr: "TEH",
  banyaknya: "",
  isi: "",
  jumlah: "120 PCS",
  keterangan: "",
  sampleType: "",
  rowKey: "rk1",
  docKey: "dk1",
  matchScore: 1,
  skuLengkap: "SKU-1",
  namaInternalAccurate: "Teh Pucuk",
  namaProdukAcuan: "Teh Pucuk",
  kategoriUtama: "",
  skus: "100001",
  barcode: "",
  sumberLembar: "",
  linkSjDrive: "",
  sheetRow: 2,
  accurateExportTag: "",
  accurateExportedAt: "",
};

describe("accurate transaction import", () => {
  it("has 37 columns like template", () => {
    expect(ACCURATE_TRANSACTION_ITEM_HEADERS).toHaveLength(37);
  });

  it("maps nama, kode, qty, gudang", () => {
    const row = dbmRecordToAccurateRow(base);
    expect(row[0]).toBe("Teh Pucuk");
    expect(row[1]).toBe(100001);
    expect(row[2]).toBe("PCS");
    expect(row[3]).toBe(120);
    expect(row[6]).toBe("Loumina");
    expect(String(row[7])).toContain("SG072236");
  });
});