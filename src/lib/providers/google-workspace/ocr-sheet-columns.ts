import { OCR_SHEET_HEADERS } from "./google-sj-export-rows";

/** Indeks kolom (0-based) — layout v2. */
export const OCR_COL = {
  GUDANG: 0,
  TANGGAL_EKSPOR: 1,
  TANGGAL_SJ: 2,
  NO_SJ: 3,
  NO_KENDARAAN: 4,
  NO_PO: 5,
  NAMA_PENERIMA: 6,
  ALAMAT: 7,
  BANYAKNYA: 8,
  ISI: 9,
  NAMA_BARANG: 10,
  JUMLAH: 11,
  KETERANGAN: 12,
  NAMA_FILE: 13,
  LINK_DRIVE: 14,
  KENDARAAN_DRIVER: 15,
  CATATAN: 16,
  STATUS: 17,
} as const;

export const OCR_SHEET_COLUMN_COUNT = OCR_SHEET_HEADERS.length;

export const OCR_SHEET_RANGE_COL = "R";

export function ocrSheetRowRange(sheetTab: string, startRow: number, endRow?: number): string {
  const end = endRow ?? startRow;
  return `'${sheetTab.replace(/'/g, "''")}'!A${startRow}:${OCR_SHEET_RANGE_COL}${end}`;
}

export function ocrSheetFullColumnsRange(sheetTab: string): string {
  return `'${sheetTab.replace(/'/g, "''")}'!A:${OCR_SHEET_RANGE_COL}`;
}

const DATE_CELL = /^\d{1,2}\/\d{1,2}\/\d{4}$/;

/** Baris data lama (kolom A = Tanggal Ekspor). */
export function isLegacyOcrDataRow(row: string[] | undefined): boolean {
  if (!row?.length) return false;
  return DATE_CELL.test(String(row[0] ?? "").trim());
}

export type OcrSheetRowFields = {
  gudang: string;
  exportTimestamp: string;
  tanggal: string;
  noSuratJalan: string;
  noKendaraan: string;
  noPo: string;
  namaPenerima: string;
  alamat: string;
  banyaknya: string;
  isi: string;
  namaBarang: string;
  jumlah: string;
  keterangan: string;
  fileName: string;
  fileUrl: string;
  kendaraanDriver: string;
  catatan: string;
  status: string;
};

export function mapOcrSheetRow(row: string[] | undefined): OcrSheetRowFields {
  const r = row ?? [];
  if (isLegacyOcrDataRow(r)) {
    return {
      gudang: "",
      exportTimestamp: String(r[0] ?? ""),
      tanggal: String(r[1] ?? ""),
      noSuratJalan: String(r[2] ?? ""),
      noKendaraan: String(r[3] ?? ""),
      noPo: String(r[4] ?? ""),
      namaPenerima: String(r[5] ?? ""),
      alamat: String(r[6] ?? ""),
      banyaknya: String(r[7] ?? ""),
      isi: String(r[8] ?? ""),
      namaBarang: String(r[9] ?? ""),
      jumlah: String(r[10] ?? ""),
      keterangan: String(r[11] ?? ""),
      fileName: String(r[12] ?? ""),
      fileUrl: String(r[13] ?? ""),
      kendaraanDriver: "",
      catatan: "",
      status: String(r[14] ?? "").trim() || "OK",
    };
  }
  return {
    gudang: String(r[OCR_COL.GUDANG] ?? ""),
    exportTimestamp: String(r[OCR_COL.TANGGAL_EKSPOR] ?? ""),
    tanggal: String(r[OCR_COL.TANGGAL_SJ] ?? ""),
    noSuratJalan: String(r[OCR_COL.NO_SJ] ?? ""),
    noKendaraan: String(r[OCR_COL.NO_KENDARAAN] ?? ""),
    noPo: String(r[OCR_COL.NO_PO] ?? ""),
    namaPenerima: String(r[OCR_COL.NAMA_PENERIMA] ?? ""),
    alamat: String(r[OCR_COL.ALAMAT] ?? ""),
    banyaknya: String(r[OCR_COL.BANYAKNYA] ?? ""),
    isi: String(r[OCR_COL.ISI] ?? ""),
    namaBarang: String(r[OCR_COL.NAMA_BARANG] ?? ""),
    jumlah: String(r[OCR_COL.JUMLAH] ?? ""),
    keterangan: String(r[OCR_COL.KETERANGAN] ?? ""),
    fileName: String(r[OCR_COL.NAMA_FILE] ?? ""),
    fileUrl: String(r[OCR_COL.LINK_DRIVE] ?? ""),
    kendaraanDriver: String(r[OCR_COL.KENDARAAN_DRIVER] ?? ""),
    catatan: String(r[OCR_COL.CATATAN] ?? ""),
    status: String(r[OCR_COL.STATUS] ?? "").trim() || "OK",
  };
}

export function ocrSheetRowToValues(fields: OcrSheetRowFields): string[] {
  return [
    fields.gudang,
    fields.exportTimestamp,
    fields.tanggal,
    fields.noSuratJalan,
    fields.noKendaraan,
    fields.noPo,
    fields.namaPenerima,
    fields.alamat,
    fields.banyaknya,
    fields.isi,
    fields.namaBarang,
    fields.jumlah,
    fields.keterangan,
    fields.fileName,
    fields.fileUrl,
    fields.kendaraanDriver,
    fields.catatan,
    fields.status,
  ];
}
