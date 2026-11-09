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
          nama_barang: {
            type: "STRING",
            description:
              "Nama barang FINAL. Jika ada coretan: pakai tulisan tangan pengganti, jangan kata cetak yang dicoret.",
          },
          teks_cetak_dicoret: {
            type: "STRING",
            description:
              "Opsional: nama barang versi cetak yang ada coretannya (hanya untuk audit), kosong jika tidak ada koreksi.",
          },
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
  "Ini foto Surat Jalan (tabel biru + tulisan tangan hitam). Foto bisa miring 90° — baca mengikuti orientasi teks.\n\n" +
  "=== KOREKAN / CORETAN (PRIORITAS TERTINGGI) ===\n" +
  "Banyak SJ: teks cetak biru, lalu koreksi tinta hitam (garis coret + tulisan di atas/ di samping).\n" +
  "1) Teks cetak yang ada garis coret (strikethrough) = TIDAK BOLEH dipakai di output.\n" +
  "2) nama_barang WAJIB versi TERBARU setelah koreksi (tulisan tangan), bukan versi cetak.\n" +
  "3) Contoh: cetak \"BOTOL BR 250ML N24 PUTIH MSS\", kata PUTIH dicoret, di atasnya tulis \"HITAM\" →\n" +
  "   nama_barang = \"BOTOL BR 250ML N24 HITAM MSS\" (bukan PUTIH).\n" +
  "4) Jika hanya satu kata diganti (warna, ukuran, dll.), ganti bagian itu saja; sisanya dari cetak yang tidak dicoret.\n" +
  "5) Isi teks_cetak_dicoret dengan nama cetak lama yang dicoret bila ada koreksi; kosongkan jika tidak ada coretan.\n" +
  "6) Tulis di keterangan: \"Koreksi tulisan: <lama> → <baru>\" bila koreksi nama barang.\n" +
  "7) Koreksi angka (banyaknya/isi/jumlah) ikuti aturan sama: angka dicoret = buang, pakai tulisan tangan pengganti.\n" +
  "8) Abaikan coretan di blok Tanda Terima / tanda tangan (bukan tabel barang).\n\n" +
  "Aturan lain:\n" +
  "- Satu baris tabel barang = satu item.\n" +
  "- Angka Indonesia: titik = pemisah ribuan (6.095 = 6095).\n" +
  "- Baris hanya total tanpa nama barang → is_subtotal=true.\n" +
  "- Tidak terbaca: kosongkan field, ragu=true, jangan mengarang.\n" +
  "- no_surat_jalan biasanya SG + 6 digit. Tanggal dd/MM/yyyy.\n" +
  "- nama_penerima & alamat dari \"Kepada Yth.\".";

export type GeminiSJItem = {
  banyaknya_qty?: number | null;
  banyaknya_satuan?: string;
  isi_qty?: number | null;
  isi_satuan?: string;
  nama_barang?: string;
  teks_cetak_dicoret?: string;
  jumlah_qty?: number | null;
  jumlah_satuan?: string;
  keterangan?: string;
  is_subtotal?: boolean;
  ragu?: boolean;
};

/** Parse "Koreksi tulisan: … → …" atau "PUTIH → HITAM" dari kolom keterangan. */
export function parseKoreksiFromKeterangan(keterangan: string | undefined): {
  fromText?: string;
  toText?: string;
  fromWord?: string;
  toWord?: string;
} | null {
  const note = String(keterangan ?? "").trim();
  if (!note) return null;
  const full = note.match(
    /koreksi\s+tulisan[^:]*:\s*(.+?)\s*(?:→|->)\s*(.+?)(?:\s*\||$)/i
  );
  if (full) {
    return { fromText: full[1].trim(), toText: full[2].trim() };
  }
  const word = note.match(/\b([A-Za-z0-9][A-Za-z0-9/]*)\s*(?:→|->)\s*([A-Za-z0-9][A-Za-z0-9/]*)\b/);
  if (word) {
    return { fromWord: word[1].trim(), toWord: word[2].trim() };
  }
  return null;
}

function replaceTokenInsensitive(haystack: string, from: string, to: string): string {
  const escaped = from.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return haystack.replace(new RegExp(`\\b${escaped}\\b`, "i"), to);
}

/** Anggap nama barang sudah final; perbaiki dari teks_cetak_dicoret / keterangan bila model salah ambil cetak. */
export function resolveItemProductName(item: GeminiSJItem): string {
  let finalName = String(item.nama_barang ?? "").trim();
  const struck = String(item.teks_cetak_dicoret ?? "").trim();
  const parsed = parseKoreksiFromKeterangan(item.keterangan);

  if (parsed?.toText) {
    const sameAsStruck = struck && finalName.toUpperCase() === struck.toUpperCase();
    const sameAsFrom =
      parsed.fromText && finalName.toUpperCase() === parsed.fromText.toUpperCase();
    if (sameAsStruck || sameAsFrom || !struck) {
      finalName = parsed.toText;
    }
  } else if (parsed?.fromWord && parsed.toWord && finalName.toUpperCase().includes(parsed.fromWord.toUpperCase())) {
    finalName = replaceTokenInsensitive(finalName, parsed.fromWord, parsed.toWord);
  }

  if (struck && finalName.toUpperCase() === struck.toUpperCase() && parsed?.toText) {
    finalName = parsed.toText;
  }

  if (!finalName) return "";
  return finalName;
}

export const SJ_STRIKETHROUGH_SCHEMA = {
  type: "OBJECT",
  properties: {
    items: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          baris: { type: "NUMBER", description: "Nomor urut baris tabel (1-based)" },
          ada_coretan: { type: "BOOLEAN" },
          nama_barang_final: {
            type: "STRING",
            description: "Nama setelah koreksi tulisan tangan; tanpa teks cetak yang dicoret",
          },
          teks_cetak_dicoret: { type: "STRING" },
        },
        required: ["baris", "ada_coretan", "nama_barang_final"],
      },
    },
  },
  required: ["items"],
} as const;

export const SJ_STRIKETHROUGH_PROMPT =
  "Foto Surat Jalan yang sama (tabel biru). Fokus HANYA kolom NAMA BARANG tiap baris produk (bukan subtotal, bukan tanda terima).\n" +
  "Untuk setiap baris: apakah ada garis coret pada teks cetak biru dan/atau tulisan hitam pengganti di atas/samping?\n" +
  "- ada_coretan=true → nama_barang_final WAJIB versi setelah koreksi (contoh: PUTIH dicoret, tulis HITAM → pakai HITAM).\n" +
  "- teks_cetak_dicoret = nama seperti tercetak sebelum coretan (audit); kosong jika tidak ada coretan.\n" +
  "- Jika tidak ada coretan: ada_coretan=false, nama_barang_final = teks cetak apa adanya.\n" +
  "Urutan baris = atas ke bawah di tabel barang.";

export type StrikethroughRefineRow = {
  baris?: number;
  ada_coretan?: boolean;
  nama_barang_final?: string;
  teks_cetak_dicoret?: string;
};

/** Gabung hasil pass khusus coretan ke payload SJ (by urutan baris non-subtotal). */
export function mergeStrikethroughRefinement(
  payload: GeminiSJPayload,
  refinement: StrikethroughRefineRow[]
): GeminiSJPayload {
  if (!refinement.length) return payload;
  const items = [...(payload.items ?? [])];
  const productIndexes = items
    .map((it, idx) => ({ it, idx }))
    .filter(({ it }) => !it.is_subtotal && String(it.nama_barang ?? "").trim());

  for (const row of refinement) {
    if (!row.ada_coretan) continue;
    const finalName = String(row.nama_barang_final ?? "").trim();
    if (!finalName) continue;
    const oneBased = row.baris ?? 0;
    const target = oneBased >= 1 ? productIndexes[oneBased - 1] : undefined;
    const idx = target?.idx ?? productIndexes[0]?.idx;
    if (idx === undefined) continue;
    const prev = items[idx];
    const struck = String(row.teks_cetak_dicoret ?? prev.teks_cetak_dicoret ?? "").trim();
    items[idx] = {
      ...prev,
      nama_barang: finalName,
      teks_cetak_dicoret: struck || prev.teks_cetak_dicoret,
      ragu: prev.ragu,
    };
  }

  return { ...payload, items };
}

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
      const cetakDicoret = String(i.teks_cetak_dicoret ?? "").trim();
      if (cetakDicoret && resolveItemProductName(i).toUpperCase() !== cetakDicoret.toUpperCase()) {
        if (!keterangan.toLowerCase().includes("koreksi")) {
          keterangan = `Koreksi tulisan (cetak dicoret): ${cetakDicoret} → ${resolveItemProductName(i)}${keterangan ? ` | ${keterangan}` : ""}`;
        }
      }
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
        supplierProductName: resolveItemProductName(i).toUpperCase(),
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
