import type { DbmInboundRecord } from "@/lib/dbm/dbm-inbound-types";
import { parseQuantityAmount } from "@/lib/dbm/parse-quantity";

/** Header selaras file template Accurate `transaction-item-import-item-id.xlsx`. */
export const ACCURATE_TRANSACTION_ITEM_HEADERS = [
  "Nama Barang",
  "Kode",
  "Satuan",
  "Kuantitas",
  "Harga Satuan",
  "Diskon (Rp)",
  "Nama Gudang",
  "Catatan Barang",
  "Nama Dept Barang",
  "No Proyek Barang",
  "Kustom Karakter 1",
  "Kustom Karakter 2",
  "Kustom Karakter 3",
  "Kustom Karakter 4",
  "Kustom Karakter 5",
  "Kustom Karakter 6",
  "Kustom Karakter 7",
  "Kustom Karakter 8",
  "Kustom Karakter 9",
  "Kustom Karakter 10",
  "Kustom Karakter 11",
  "Kustom Karakter 12",
  "Kustom Karakter 13",
  "Kustom Karakter 14",
  "Kustom Karakter 15",
  "Kustom Angka1",
  "Kustom Angka 2",
  "Kustom Angka 3",
  "Kustom Angka 4",
  "Kustom Angka 5",
  "Kustom Angka 6",
  "Kustom Angka 7",
  "Kustom Angka 8",
  "Kustom Angka 9",
  "Kustom Angka 10",
  "Kustom Tanggal 1",
  "Kustom Tanggal 2",
] as const;

function parseAccurateItemCode(skus: string): string | number {
  const raw = String(skus ?? "").trim();
  if (!raw) return "";
  const digits = raw.replace(/\s/g, "");
  if (/^\d+$/.test(digits)) {
    const n = Number(digits);
    return Number.isSafeInteger(n) ? n : digits;
  }
  return raw;
}

function accurateWarehouseName(gudang: string): string {
  const g = String(gudang ?? "").trim();
  return g.replace(/^Gudang\s+/i, "").trim() || g;
}

export function isDbmAccurateExported(record: DbmInboundRecord): boolean {
  const tag = String(record.accurateExportTag ?? "").trim().toLowerCase();
  if (tag === "ya" || tag === "yes" || tag === "exported") return true;
  return Boolean(String(record.accurateExportedAt ?? "").trim());
}

export function dbmRecordToAccurateRow(record: DbmInboundRecord): (string | number | null)[] {
  const q = parseQuantityAmount(record.jumlah);
  const namaBarang =
    record.namaInternalAccurate.trim() ||
    record.namaProdukAcuan.trim() ||
    record.namaBarangOcr.trim();
  const catatan = [
    record.noSj ? `SJ ${record.noSj}` : "",
    record.supplier ? `Supplier: ${record.supplier}` : "",
    record.tanggalSj ? `Tgl SJ: ${record.tanggalSj}` : "",
    record.keterangan?.trim(),
  ]
    .filter(Boolean)
    .join(" · ");

  const row: (string | number | null)[] = ACCURATE_TRANSACTION_ITEM_HEADERS.map(() => null);
  row[0] = namaBarang;
  row[1] = parseAccurateItemCode(record.skus);
  row[2] = q.unit || "PCS";
  row[3] = q.amount > 0 ? q.amount : null;
  row[4] = null;
  row[5] = null;
  row[6] = accurateWarehouseName(record.gudang);
  row[7] = catatan || null;
  row[10] = record.noSj || null;
  row[11] = record.supplier || null;
  row[12] = record.skuLengkap || null;
  return row;
}

export function dbmRecordsToAccurateRows(records: DbmInboundRecord[]): (string | number | null)[][] {
  return records.map(dbmRecordToAccurateRow);
}