import { DEFAULT_OCR_REVIEW_STATUS, normalizeOcrReviewStatus } from "@/lib/ocr-review/workflow-status";
import {
  DEFAULT_SAMPLE_ITEM_TAG,
  inferSampleItemTag,
  normalizeSampleItemTag,
} from "@/lib/surat-jalan/sample-item-tag";
import { OCR_SHEET_HEADERS } from "./google-sj-export-rows";

/** Indeks kolom (0-based) — layout v3 (Data Compilation). */
export const OCR_COL = {
  GUDANG: 0,
  SUPPLIER: 1,
  NAMA_CUSTOMER: 2,
  TANGGAL_EKSPOR: 3,
  TANGGAL_SJ: 4,
  NO_SJ: 5,
  NO_KENDARAAN: 6,
  NO_PO: 7,
  NAMA_PENERIMA: 8,
  ALAMAT: 9,
  BANYAKNYA: 10,
  ISI: 11,
  NAMA_BARANG: 12,
  JUMLAH: 13,
  KETERANGAN: 14,
  NAMA_FILE: 15,
  LINK_DRIVE: 16,
  KENDARAAN_DRIVER: 17,
  CATATAN: 18,
  STATUS: 19,
  STATUS_REVIEW: 20,
  LINK_REVISI: 21,
  SAMPLE_TYPE: 22,
  TS_KIRIM_SUPPLIER: 23,
  TS_DITINJAU_GUDANG: 24,
  TS_REVISI_GUDANG: 25,
  TS_APPROVE_GUDANG: 26,
  TS_KONFIRMASI_SUPPLIER: 27,
} as const;

const DATE_CELL = /^\d{1,2}\/\d{1,2}\/\d{4}$/;

/** Baris lama tanpa kolom Nama Customer — Tanggal Ekspor masih di indeks 2. */
export function ocrSheetRowHasCustomerColumn(row: string[]): boolean {
  const c2 = String(row[2] ?? "").trim();
  return !(c2 && DATE_CELL.test(c2));
}

function v3Col(row: string[], col: number): number {
  if (col < OCR_COL.NAMA_CUSTOMER) return col;
  return ocrSheetRowHasCustomerColumn(row) ? col : col - 1;
}

export const OCR_SHEET_COLUMN_COUNT = OCR_SHEET_HEADERS.length;

export const OCR_SHEET_RANGE_COL = "AA";

export function ocrSheetRowRange(sheetTab: string, startRow: number, endRow?: number): string {
  const end = endRow ?? startRow;
  return `'${sheetTab.replace(/'/g, "''")}'!A${startRow}:${OCR_SHEET_RANGE_COL}${end}`;
}

export function ocrSheetFullColumnsRange(sheetTab: string): string {
  return `'${sheetTab.replace(/'/g, "''")}'!A:${OCR_SHEET_RANGE_COL}`;
}

function rowHasGudangPrefix(row: string[]): boolean {
  return /^gudang\b/i.test(String(row[0] ?? "").trim());
}

/** Baris data lama (kolom A = Tanggal Ekspor). */
export function isLegacyOcrDataRow(row: string[] | undefined): boolean {
  if (!row?.length) return false;
  return DATE_CELL.test(String(row[0] ?? "").trim());
}

/** v2 tanpa kolom Supplier (Gudang + Tanggal Ekspor di B). */
export function isLegacyOcrGudangOnlyRow(row: string[] | undefined): boolean {
  if (!row?.length) return false;
  if (isLegacyOcrDataRow(row)) return false;
  return rowHasGudangPrefix(row) && DATE_CELL.test(String(row[1] ?? "").trim());
}

export type OcrSheetRowFields = {
  gudang: string;
  supplier: string;
  exportTimestamp: string;
  tanggal: string;
  noSuratJalan: string;
  noKendaraan: string;
  noPo: string;
  namaPenerima: string;
  alamat: string;
  banyaknya: string;
  isi: string;
  namaCustomer: string;
  namaBarang: string;
  jumlah: string;
  keterangan: string;
  fileName: string;
  fileUrl: string;
  kendaraanDriver: string;
  catatan: string;
  status: string;
  statusReview: string;
  linkRevisi: string;
  sampleType: string;
  tsKirimSupplier: string;
  tsDitinjauGudang: string;
  tsRevisiGudang: string;
  tsApproveGudang: string;
  tsKonfirmasiSupplier: string;
};

function workflowTsFromRow(r: string[], col: number): string {
  return String(r[col] ?? "").trim();
}

function emptyWorkflowTs(): Pick<
  OcrSheetRowFields,
  "tsKirimSupplier" | "tsDitinjauGudang" | "tsRevisiGudang" | "tsApproveGudang" | "tsKonfirmasiSupplier"
> {
  return {
    tsKirimSupplier: "",
    tsDitinjauGudang: "",
    tsRevisiGudang: "",
    tsApproveGudang: "",
    tsKonfirmasiSupplier: "",
  };
}

export function mapOcrSheetRow(row: string[] | undefined): OcrSheetRowFields {
  const r = row ?? [];
  if (isLegacyOcrDataRow(r)) {
    return {
      gudang: "",
      supplier: "Unverified",
      namaCustomer: "",
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
      statusReview: DEFAULT_OCR_REVIEW_STATUS,
      linkRevisi: "",
      sampleType: DEFAULT_SAMPLE_ITEM_TAG,
      ...emptyWorkflowTs(),
    };
  }
  if (isLegacyOcrGudangOnlyRow(r)) {
    return {
      gudang: String(r[0] ?? ""),
      supplier: "Unverified",
      namaCustomer: "",
      exportTimestamp: String(r[1] ?? ""),
      tanggal: String(r[2] ?? ""),
      noSuratJalan: String(r[3] ?? ""),
      noKendaraan: String(r[4] ?? ""),
      noPo: String(r[5] ?? ""),
      namaPenerima: String(r[6] ?? ""),
      alamat: String(r[7] ?? ""),
      banyaknya: String(r[8] ?? ""),
      isi: String(r[9] ?? ""),
      namaBarang: String(r[10] ?? ""),
      jumlah: String(r[11] ?? ""),
      keterangan: String(r[12] ?? ""),
      fileName: String(r[13] ?? ""),
      fileUrl: String(r[14] ?? ""),
      kendaraanDriver: String(r[15] ?? ""),
      catatan: String(r[16] ?? ""),
      status: String(r[17] ?? "").trim() || "OK",
      statusReview: DEFAULT_OCR_REVIEW_STATUS,
      linkRevisi: "",
      sampleType: DEFAULT_SAMPLE_ITEM_TAG,
      ...emptyWorkflowTs(),
    };
  }
  return {
    gudang: String(r[v3Col(r, OCR_COL.GUDANG)] ?? ""),
    supplier: String(r[v3Col(r, OCR_COL.SUPPLIER)] ?? "").trim() || "Unverified",
    namaCustomer: ocrSheetRowHasCustomerColumn(r)
      ? String(r[v3Col(r, OCR_COL.NAMA_CUSTOMER)] ?? "").trim()
      : "",
    exportTimestamp: String(r[v3Col(r, OCR_COL.TANGGAL_EKSPOR)] ?? ""),
    tanggal: String(r[v3Col(r, OCR_COL.TANGGAL_SJ)] ?? ""),
    noSuratJalan: String(r[v3Col(r, OCR_COL.NO_SJ)] ?? ""),
    noKendaraan: String(r[v3Col(r, OCR_COL.NO_KENDARAAN)] ?? ""),
    noPo: String(r[v3Col(r, OCR_COL.NO_PO)] ?? ""),
    namaPenerima: String(r[v3Col(r, OCR_COL.NAMA_PENERIMA)] ?? ""),
    alamat: String(r[v3Col(r, OCR_COL.ALAMAT)] ?? ""),
    banyaknya: String(r[v3Col(r, OCR_COL.BANYAKNYA)] ?? ""),
    isi: String(r[v3Col(r, OCR_COL.ISI)] ?? ""),
    namaBarang: String(r[v3Col(r, OCR_COL.NAMA_BARANG)] ?? ""),
    jumlah: String(r[v3Col(r, OCR_COL.JUMLAH)] ?? ""),
    keterangan: String(r[v3Col(r, OCR_COL.KETERANGAN)] ?? ""),
    fileName: String(r[v3Col(r, OCR_COL.NAMA_FILE)] ?? ""),
    fileUrl: String(r[v3Col(r, OCR_COL.LINK_DRIVE)] ?? ""),
    kendaraanDriver: String(r[v3Col(r, OCR_COL.KENDARAAN_DRIVER)] ?? ""),
    catatan: String(r[v3Col(r, OCR_COL.CATATAN)] ?? ""),
    status: String(r[v3Col(r, OCR_COL.STATUS)] ?? "").trim() || "OK",
    statusReview: normalizeOcrReviewStatus(r[v3Col(r, OCR_COL.STATUS_REVIEW)]),
    linkRevisi: String(r[v3Col(r, OCR_COL.LINK_REVISI)] ?? "").trim(),
    sampleType: normalizeSampleItemTag(
      String(r[v3Col(r, OCR_COL.SAMPLE_TYPE)] ?? "").trim() ||
        inferSampleItemTag(
          String(r[v3Col(r, OCR_COL.KETERANGAN)] ?? ""),
          String(r[v3Col(r, OCR_COL.CATATAN)] ?? ""),
          String(r[v3Col(r, OCR_COL.NAMA_BARANG)] ?? "")
        )
    ),
    tsKirimSupplier: workflowTsFromRow(r, v3Col(r, OCR_COL.TS_KIRIM_SUPPLIER)),
    tsDitinjauGudang: workflowTsFromRow(r, v3Col(r, OCR_COL.TS_DITINJAU_GUDANG)),
    tsRevisiGudang: workflowTsFromRow(r, v3Col(r, OCR_COL.TS_REVISI_GUDANG)),
    tsApproveGudang: workflowTsFromRow(r, v3Col(r, OCR_COL.TS_APPROVE_GUDANG)),
    tsKonfirmasiSupplier: workflowTsFromRow(r, v3Col(r, OCR_COL.TS_KONFIRMASI_SUPPLIER)),
  };
}

export function ocrSheetRowToValues(fields: OcrSheetRowFields): string[] {
  return [
    fields.gudang,
    fields.supplier,
    fields.namaCustomer,
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
    fields.statusReview,
    fields.linkRevisi,
    fields.sampleType,
    fields.tsKirimSupplier,
    fields.tsDitinjauGudang,
    fields.tsRevisiGudang,
    fields.tsApproveGudang,
    fields.tsKonfirmasiSupplier,
  ];
}
