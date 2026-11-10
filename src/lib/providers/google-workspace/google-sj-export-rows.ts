import type { GeminiSJItem, GeminiSJPayload } from "@/lib/providers/ocr/gemini-surat-jalan";
import { DEFAULT_OCR_REVIEW_STATUS } from "@/lib/ocr-review/workflow-status";

/** Kolom A–R — selaras `buildGoogleSheetRows`, `ocr-sheet-columns`, dan review. */
export const OCR_SHEET_HEADERS = [
  "Gudang tujuan",
  "Supplier",
  "Tanggal Ekspor",
  "Tanggal SJ",
  "No. Surat Jalan",
  "No. Kendaraan",
  "No. PO",
  "Nama Penerima",
  "Alamat",
  "Banyaknya",
  "Isi",
  "Nama Barang",
  "Jumlah",
  "Keterangan",
  "Nama File",
  "Link Drive",
  "Kendaraan / Driver",
  "Catatan",
  "Status",
  "Status Review",
  "Link Revisi",
] as const;

export const OCR_SHEET_LEGACY_HEADER = "Tanggal Ekspor";

function formatQtySatuan(qty: number | null | undefined, satuan: string | undefined): string {
  if (qty === null || qty === undefined) return "";
  const s = (satuan || "").trim();
  return s ? `${qty} ${s}` : String(qty);
}

function formatDateDdMmYyyy(isoOrSlash: string | undefined | null): string {
  if (!isoOrSlash) return "";
  const slash = isoOrSlash.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (slash) {
    return `${slash[1].padStart(2, "0")}/${slash[2].padStart(2, "0")}/${slash[3]}`;
  }
  const iso = isoOrSlash.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) {
    return `${iso[3]}/${iso[2]}/${iso[1]}`;
  }
  return isoOrSlash;
}

function exportTimestamp(now = new Date()): string {
  const d = String(now.getDate()).padStart(2, "0");
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const y = now.getFullYear();
  return `${d}/${m}/${y}`;
}

function lineStatus(item: GeminiSJItem): "OK" | "CEK" {
  const calc =
    item.banyaknya_qty != null && item.isi_qty != null
      ? item.banyaknya_qty * item.isi_qty
      : null;
  const mismatch =
    calc !== null && item.jumlah_qty != null && calc !== item.jumlah_qty;
  const missing = item.banyaknya_qty == null || item.jumlah_qty == null;
  if (item.ragu || mismatch || missing) return "CEK";
  return "OK";
}

function tanggalToYyyyMmDd(tanggal: string | undefined | null): string {
  const slash = formatDateDdMmYyyy(tanggal ?? "");
  const m = slash.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (m) return `${m[3]}${m[2]}${m[1]}`;
  const iso = String(tanggal ?? "").match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}${iso[2]}${iso[3]}`;
  return "";
}

function tanggalToIsoDate(tanggal: string | undefined | null): string {
  const ymd = tanggalToYyyyMmDd(tanggal);
  if (ymd.length === 8) {
    return `${ymd.slice(0, 4)}-${ymd.slice(4, 6)}-${ymd.slice(6, 8)}`;
  }
  return "unknown-date";
}

function sanitizeDriveFileSegment(value: string): string {
  return value
    .trim()
    .replace(/[\\/:*?"<>|]/g, " ")
    .replace(/\s+/g, " ")
    .slice(0, 120);
}

function sanitizeSuratJalanToken(value: string): string {
  const cleaned = value.trim().replace(/[^\w\-]+/g, "_").replace(/_+/g, "_");
  return cleaned || "UNKNOWN";
}

/** Subfolder di Drive: `2026-11-09 - SG072236 - PT Maju Jaya` */
export function buildSuratJalanDriveSubfolderName(params: {
  tanggal: string;
  noSuratJalan: string;
  supplierName: string;
}): string {
  const dateLabel = tanggalToIsoDate(params.tanggal);
  const noSj = (params.noSuratJalan || "UNKNOWN").trim().toUpperCase();
  const supplier = sanitizeDriveFileSegment(params.supplierName || "Supplier");
  return `${dateLabel} - ${noSj} - ${supplier}`;
}

export function buildSuratJalanFileName(params: {
  tanggal: string;
  noSuratJalan: string;
  ext: string;
  supplierName?: string;
  gudang?: string;
  /** Urutan gambar dalam satu submit (1-based). Dipakai bila `batchTotal` > 1. */
  batchIndex?: number;
  batchTotal?: number;
}): string {
  const ext = params.ext.startsWith(".") ? params.ext : `.${params.ext}`;
  const noSj = sanitizeSuratJalanToken(params.noSuratJalan || "UNKNOWN");
  const batchTotal = params.batchTotal ?? 1;
  const batchIndex = params.batchIndex ?? 1;
  const batchSuffix =
    batchTotal > 1 && batchIndex >= 1 ? ` (${batchIndex})` : "";

  if (params.supplierName?.trim() && params.gudang?.trim()) {
    const datePart = tanggalToYyyyMmDd(params.tanggal) || "unknown";
    const supplier = sanitizeDriveFileSegment(params.supplierName);
    const gudang = sanitizeDriveFileSegment(params.gudang);
    return `SJ_${datePart}_${supplier}_${noSj}_${gudang}${batchSuffix}${ext}`;
  }

  const datePart = formatDateDdMmYyyy(params.tanggal).replace(/\//g, "-") || "unknown-date";
  return `Surat Jalan_${datePart}_${noSj}${batchSuffix}${ext}`;
}

/** Satu baris sheet = satu item (kolom sesuai template GBC). */
export function buildGoogleSheetRows(params: {
  payload: GeminiSJPayload;
  fileName: string;
  fileUrl: string;
  exportedAt?: Date;
  gudang?: string;
  supplierName?: string;
  kendaraanDriver?: string;
  catatan?: string;
  fallback?: {
    suratJalanNumber?: string | null;
    documentDate?: Date | null;
    vehicleInfo?: string | null;
    poReference?: string | null;
    destinationText?: string | null;
  };
}): string[][] {
  const { payload, fileName, fileUrl, exportedAt = new Date(), fallback } = params;
  const timestamp = exportTimestamp(exportedAt);
  const tanggal =
    formatDateDdMmYyyy(payload.tanggal) ||
    (fallback?.documentDate ? formatDateDdMmYyyy(fallback.documentDate.toISOString().slice(0, 10)) : "");
  const noSj = (payload.no_surat_jalan || fallback?.suratJalanNumber || "").toUpperCase();
  const noKendaraan = (payload.no_kendaraan || fallback?.vehicleInfo || "").toUpperCase();
  const noPo = payload.no_po || fallback?.poReference || "";
  const gudang = (params.gudang || "").trim();
  const supplier =
    (params.supplierName || "").trim() || "Unverified";
  const kendaraanDriver = (params.kendaraanDriver || "").trim();
  const catatan = (params.catatan || "").trim();
  let namaPenerima = payload.nama_penerima || "";
  let alamat = payload.alamat || "";
  if (!namaPenerima && !alamat && fallback?.destinationText) {
    const parts = fallback.destinationText.split(" — ");
    if (parts.length >= 2) {
      namaPenerima = parts[0];
      alamat = parts.slice(1).join(" — ");
    } else {
      alamat = fallback.destinationText;
    }
  }

  const items = (payload.items ?? []).filter((i) => !i.is_subtotal && i.nama_barang);

  if (items.length === 0) {
    return [
      [
        gudang,
        supplier,
        timestamp,
        tanggal,
        noSj,
        noKendaraan,
        noPo,
        namaPenerima,
        alamat,
        "",
        "",
        "",
        "",
        "Tidak ada baris terdeteksi",
        fileName,
        fileUrl,
        kendaraanDriver,
        catatan,
        "CEK",
        DEFAULT_OCR_REVIEW_STATUS,
        "",
      ],
    ];
  }

  return items.map((item) => {
    const jumlah =
      item.jumlah_qty != null
        ? formatQtySatuan(item.jumlah_qty, item.jumlah_satuan || "PCS")
        : "";
    return [
      gudang,
      supplier,
      timestamp,
      tanggal,
      noSj,
      noKendaraan,
      noPo,
      namaPenerima,
      alamat,
      formatQtySatuan(item.banyaknya_qty, item.banyaknya_satuan),
      formatQtySatuan(item.isi_qty, item.isi_satuan),
      String(item.nama_barang || "").toUpperCase(),
      jumlah,
      (item.keterangan || "").trim(),
      fileName,
      fileUrl,
      kendaraanDriver,
      catatan,
      lineStatus(item),
      DEFAULT_OCR_REVIEW_STATUS,
      "",
    ];
  });
}

export function parseGeminiPayloadFromStructured(structured: unknown): GeminiSJPayload | null {
  if (!structured || typeof structured !== "object") return null;
  const o = structured as { geminiPayload?: GeminiSJPayload };
  if (o.geminiPayload && typeof o.geminiPayload === "object") {
    return o.geminiPayload;
  }
  return null;
}

/** Baris data OCR valid (abaikan baris sampah cuma kolom Status). */
export function isMeaningfulOcrDataRow(row: string[] | undefined): boolean {
  if (!row?.length) return false;
  const exportedLegacy = String(row[0] ?? "").trim();
  if (exportedLegacy && /^\d{1,2}\/\d{1,2}\/\d{4}$/.test(exportedLegacy)) return true;
  const exportedV3 = String(row[2] ?? "").trim();
  if (exportedV3 && /^\d{1,2}\/\d{1,2}\/\d{4}$/.test(exportedV3)) return true;
  const exportedV2 = String(row[1] ?? "").trim();
  if (exportedV2 && /^\d{1,2}\/\d{1,2}\/\d{4}$/.test(exportedV2)) return true;
  const noSj = String(row[4] ?? row[3] ?? row[2] ?? "").trim();
  if (noSj) return true;
  const fileName = String(row[14] ?? row[13] ?? row[12] ?? "").trim();
  return fileName.length > 0;
}

export function parseQtySatuanCell(value: string): number | null {
  const m = String(value ?? "")
    .trim()
    .match(/^([\d.,]+)/);
  if (!m) return null;
  const n = Number(m[1].replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

export function recomputeOcrSheetLineStatus(cells: {
  banyaknya: string;
  isi: string;
  jumlah: string;
  namaBarang: string;
}): "OK" | "CEK" {
  if (!cells.namaBarang.trim()) return "CEK";
  const banyaknya = parseQtySatuanCell(cells.banyaknya);
  const isi = parseQtySatuanCell(cells.isi);
  const jumlah = parseQtySatuanCell(cells.jumlah);
  const calc = banyaknya != null && isi != null ? banyaknya * isi : null;
  const mismatch = calc !== null && jumlah != null && calc !== jumlah;
  const missing = banyaknya == null || jumlah == null;
  if (mismatch || missing) return "CEK";
  return "OK";
}

/** Baris 1-based untuk tulis data OCR berikutnya (setelah header + baris data terakhir). */
export function nextOcrDataRowNumber(rows: string[][]): number {
  let lastData = 1;
  for (let i = 0; i < rows.length; i += 1) {
    const row = rows[i];
    if (i === 0 && String(row?.[0] ?? "").trim() === OCR_SHEET_HEADERS[0]) continue;
    if (isMeaningfulOcrDataRow(row)) lastData = i + 1;
  }
  return lastData + 1;
}
