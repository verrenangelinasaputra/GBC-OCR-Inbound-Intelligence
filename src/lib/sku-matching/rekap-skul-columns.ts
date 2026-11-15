import { coerceSheetCell } from "@/lib/sku-matching/coerce-string";

/** Indeks kolom 0-based pada satu baris REKAP SKUL. */
export type RekapSkulColMap = {
  rowNo: number;
  skuLengkap: number;
  namaInternalAccurate: number;
  namaProdukAcuan: number;
  kategoriUtama: number;
  skus: number;
  barcode: number;
  sumberLembar: number;
};

/** Layout default REKAP SKUL v2: A No, B SKU Lengkap, C Nama Internal Accurate, D Nama Produk Acuan, … */
export const REKAP_SKUL_DEFAULT_COL: RekapSkulColMap = {
  rowNo: 0,
  skuLengkap: 1,
  namaInternalAccurate: 2,
  namaProdukAcuan: 3,
  kategoriUtama: 4,
  skus: 5,
  barcode: 6,
  sumberLembar: 7,
};

function headerNorm(cell: string): string {
  return String(cell ?? "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function findCol(headerRow: string[], patterns: string[]): number {
  for (let i = 0; i < headerRow.length; i += 1) {
    const h = headerNorm(headerRow[i] ?? "");
    if (!h) continue;
    if (patterns.some((p) => h.includes(p))) return i;
  }
  return -1;
}

/** Deteksi indeks kolom dari baris header (baris 1 sheet). */
export function rekapSkulColumnMap(headerRow: string[]): RekapSkulColMap {
  const sku = findCol(headerRow, ["sku lengkap"]);
  const internal = findCol(headerRow, ["nama internal accurate", "nama internal"]);
  const acuan = findCol(headerRow, ["nama produk acuan", "produk acuan"]);
  const kategori = findCol(headerRow, ["kategori utama", "kategori"]);
  const skus = findCol(headerRow, ["skus", "sku s"]);
  const barcode = findCol(headerRow, ["barcode", "bar code"]);
  const sumber = findCol(headerRow, ["sumber lembar", "sumber"]);
  const rowNo = findCol(headerRow, ["no", "nomor", "id"]);

  const pick = (found: number, fallback: number) => (found >= 0 ? found : fallback);

  return {
    rowNo: pick(rowNo, REKAP_SKUL_DEFAULT_COL.rowNo),
    skuLengkap: pick(sku, REKAP_SKUL_DEFAULT_COL.skuLengkap),
    namaInternalAccurate: pick(internal, REKAP_SKUL_DEFAULT_COL.namaInternalAccurate),
    namaProdukAcuan: pick(acuan, REKAP_SKUL_DEFAULT_COL.namaProdukAcuan),
    kategoriUtama: pick(kategori, REKAP_SKUL_DEFAULT_COL.kategoriUtama),
    skus: pick(skus, REKAP_SKUL_DEFAULT_COL.skus),
    barcode: pick(barcode, REKAP_SKUL_DEFAULT_COL.barcode),
    sumberLembar: pick(sumber, REKAP_SKUL_DEFAULT_COL.sumberLembar),
  };
}

function at(row: string[], index: number): string {
  return String(row[index] ?? "").trim();
}

export function parseRekapSkulDataRow(
  row: string[],
  rowIndex: number,
  cols: RekapSkulColMap
): {
  rowNo: string;
  skuLengkap: string;
  namaInternalAccurate: string;
  namaProdukAcuan: string;
  kategoriUtama: string;
  skus: string;
  barcode: string;
  sumberLembar: string;
} | null {
  const skuLengkap = at(row, cols.skuLengkap);
  const namaInternalAccurate = at(row, cols.namaInternalAccurate);
  const namaProdukAcuan = at(row, cols.namaProdukAcuan);
  const rowNo = at(row, cols.rowNo) || String(rowIndex);

  if (!skuLengkap && !namaInternalAccurate && !namaProdukAcuan) return null;

  return {
    rowNo,
    skuLengkap: coerceSheetCell(skuLengkap),
    namaInternalAccurate: coerceSheetCell(namaInternalAccurate),
    namaProdukAcuan: coerceSheetCell(namaProdukAcuan),
    kategoriUtama: coerceSheetCell(at(row, cols.kategoriUtama)),
    skus: coerceSheetCell(at(row, cols.skus)),
    barcode: coerceSheetCell(at(row, cols.barcode)),
    sumberLembar: coerceSheetCell(at(row, cols.sumberLembar)),
  };
}