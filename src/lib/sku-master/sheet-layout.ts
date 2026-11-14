/**
 * Layout tab PET/HDPE/… — header TABEL 1 di baris 4 (1-based), data dari baris 5.
 * Indeks kolom 0-based pada baris data (sesuai struktur spreadsheet v2).
 */
export const TABEL_HEADER_ROW = 4;
export const TABEL_TEMPLATE_DATA_ROW = 5;
export const TABEL_FIRST_DATA_ROW = 5;

export const CODE_DICT_FIRST_DATA_ROW = 5;
export const CODE_DICT_PAIR_COUNT = 9;

export const COL = {
  /** Kolom "No" pada TABEL 1 */
  TABEL_NO: 19,
  TABEL_NAMA_PRODUK_ACUAN: 20,
  TABEL_NAMA_INTERNAL: 21,
  TABEL_SUB1: 22,
  TABEL_SUB2: 23,
  TABEL_SUB3: 24,
  TABEL_SUB4: 25,
  TABEL_SUB5: 26,
  TABEL_SUB6: 27,
  TABEL_SUB7: 28,
  TABEL_SUB8: 29,
  TABEL_SUB9: 30,
  TABEL_SKU_LENGKAP: 31,
  TABEL_BARCODE: 32,
  TABEL_BARCODE_DISPLAY: 33,
  TABEL_SKUS: 34,
} as const;

export function codePairColumns(subIndex: number): { code: number; label: number } {
  if (subIndex < 1 || subIndex > 9) throw new Error("subIndex harus 1–9");
  const code = (subIndex - 1) * 2;
  return { code, label: code + 1 };
}

/** Kolom input Sub 1–9 pada TABEL (nilai kode, bukan label). */
export function tabelSubColumn(subIndex: number): number {
  const base = COL.TABEL_SUB1;
  if (subIndex < 1 || subIndex > 9) throw new Error("subIndex harus 1–9");
  return base + subIndex - 1;
}

export function columnIndexToA1(colZeroBased: number, rowOneBased: number): string {
  let n = colZeroBased + 1;
  let letters = "";
  while (n > 0) {
    const rem = (n - 1) % 26;
    letters = String.fromCharCode(65 + rem) + letters;
    n = Math.floor((n - 1) / 26);
  }
  return `${letters}${rowOneBased}`;
}