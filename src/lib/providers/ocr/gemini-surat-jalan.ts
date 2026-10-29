/** Schema & prompt Surat Jalan — selaras dengan Apps Script Gemini Vision GBC */

export const SJ_GEMINI_SCHEMA = {
  type: "OBJECT",
  properties: {
    tanggal: { type: "STRING", description: "dd/MM/yyyy" },
    no_surat_jalan: { type: "STRING" },
    no_kendaraan: { type: "STRING" },
    no_po: { type: "STRING" },
    nama_penerima: { type: "STRING" },
    alamat: { type: "STRING" },
    items: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          banyaknya_qty: { type: "NUMBER", nullable: true },
          banyaknya_satuan: { type: "STRING" },
          isi_qty: { type: "NUMBER", nullable: true },
          isi_satuan: { type: "STRING" },
          nama_barang: { type: "STRING" },
          jumlah_qty: { type: "NUMBER", nullable: true },
          jumlah_satuan: { type: "STRING" },
          keterangan: { type: "STRING" },
          is_subtotal: {
            type: "BOOLEAN",
            description: "true jika baris hanya total (tanpa nama barang)",
          },
          ragu: { type: "BOOLEAN", description: "true jika tulisan sulit dibaca" },
        },
        required: ["nama_barang", "is_subtotal", "ragu"],
      },
    },
  },
  required: ["tanggal", "no_surat_jalan", "items"],
} as const;

export const SJ_GEMINI_PROMPT =
  "Ini foto surat jalan. Foto mungkin miring/diputar 90°, baca sesuai orientasi teks.\n" +
  "Aturan:\n" +
  "- Satu baris barang di tabel = satu elemen items.\n" +
  "- Angka Indonesia: titik = pemisah ribuan (6.095 = 6095).\n" +
  "- Kata yang dicoret DIABAIKAN; pakai tulisan tangan pengganti di atasnya (mis. PUTIH dicoret, ditulis HITAM → HITAM).\n" +
  "- Baris yang hanya berisi total (banyaknya + jumlah, tanpa nama barang) → is_subtotal=true.\n" +
  "- Abaikan coretan tanda tangan dan tulisan tangan di \"Tanda Terima\".\n" +
  "- Jangan menebak: kalau tidak terbaca, kosongkan field dan set ragu=true.\n" +
  "- no_surat_jalan berformat SG + 6 digit. Tanggal dd/MM/yyyy.\n" +
  "- Nama penerima dan alamat diambil dari bagian \"Kepada Yth.\".";

export type GeminiSJItem = {
  banyaknya_qty?: number | null;
  banyaknya_satuan?: string;
  isi_qty?: number | null;
  isi_satuan?: string;
  nama_barang?: string;
  jumlah_qty?: number | null;
  jumlah_satuan?: string;
  keterangan?: string;
  is_subtotal?: boolean;
  ragu?: boolean;
};

export type GeminiSJPayload = {
  tanggal?: string;
  no_surat_jalan?: string;
  no_kendaraan?: string;
  no_po?: string;
  nama_penerima?: string;
  alamat?: string;
  items?: GeminiSJItem[];
};

export function parseGeminiDateToIso(tanggal: string | undefined): string | undefined {
  if (!tanggal) return undefined;
  const m = tanggal.trim().match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (!m) return undefined;
  const d = m[1].padStart(2, "0");
  const mo = m[2].padStart(2, "0");
  return `${m[3]}-${mo}-${d}`;
}

function formatQtySatuan(qty: number | null | undefined, satuan: string | undefined): string {
  if (qty === null || qty === undefined) return "";
  return satuan ? `${qty} ${satuan}` : String(qty);
}

export function geminiPayloadToLineItems(data: GeminiSJPayload) {
  const items = (data.items ?? [])
    .filter((i) => !i.is_subtotal && i.nama_barang)
    .map((i, idx) => {
      const calc =
        i.banyaknya_qty != null && i.isi_qty != null ? i.banyaknya_qty * i.isi_qty : null;
      const mismatch =
        calc !== null && i.jumlah_qty != null && calc !== i.jumlah_qty;
      const missing = i.banyaknya_qty == null || i.jumlah_qty == null;
      const flag = !!i.ragu || mismatch || missing;

      let keterangan = i.keterangan || "";
      if (mismatch) {
        keterangan += ` [CEK: ${i.banyaknya_qty}×${i.isi_qty}≠${i.jumlah_qty}]`;
      }
      const meta = [
        formatQtySatuan(i.banyaknya_qty, i.banyaknya_satuan) && `Banyaknya: ${formatQtySatuan(i.banyaknya_qty, i.banyaknya_satuan)}`,
        formatQtySatuan(i.isi_qty, i.isi_satuan) && `Isi: ${formatQtySatuan(i.isi_qty, i.isi_satuan)}`,
        keterangan.trim(),
      ]
        .filter(Boolean)
        .join(" | ");

      const jumlahQty =
        i.jumlah_qty != null ? i.jumlah_qty : calc != null ? calc : undefined;

      return {
        lineNumber: idx + 1,
        supplierProductName: String(i.nama_barang || "").toUpperCase(),
        quantity: jumlahQty != null ? String(jumlahQty) : undefined,
        unit: (i.jumlah_satuan || "PCS").trim(),
        lineTotal: meta || undefined,
        extractionNotes: meta || undefined,
        confidence: flag ? 0.55 : 0.92,
        needsReview: flag,
      };
    });

  return items;
}
