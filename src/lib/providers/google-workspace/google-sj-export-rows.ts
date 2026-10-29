import type { GeminiSJItem, GeminiSJPayload } from "@/lib/providers/ocr/gemini-surat-jalan";

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

export function buildSuratJalanFileName(params: {
  tanggal: string;
  noSuratJalan: string;
  ext: string;
}): string {
  const datePart = formatDateDdMmYyyy(params.tanggal).replace(/\//g, "-") || "unknown-date";
  const no = (params.noSuratJalan || "UNKNOWN").replace(/[^\w\-]+/g, "_");
  const ext = params.ext.startsWith(".") ? params.ext : `.${params.ext}`;
  return `Surat Jalan_${datePart}_${no}${ext}`;
}

/** Satu baris sheet = satu item (kolom sesuai template GBC). */
export function buildGoogleSheetRows(params: {
  payload: GeminiSJPayload;
  fileName: string;
  fileUrl: string;
  exportedAt?: Date;
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
        "CEK",
      ],
    ];
  }

  return items.map((item) => {
    const jumlah =
      item.jumlah_qty != null
        ? formatQtySatuan(item.jumlah_qty, item.jumlah_satuan || "PCS")
        : "";
    return [
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
      lineStatus(item),
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
