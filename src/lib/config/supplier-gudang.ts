export const SUPPLIER_GUDANG_OPTIONS = [
  "Gudang Karanggan",
  "Gudang Loumina",
  "Gudang Klapanunggal",
  "Gudang Barata",
  "Gudang Kijang",
  "Gudang Kediri",
] as const;

export type SupplierGudang = (typeof SUPPLIER_GUDANG_OPTIONS)[number];

export const SUPPLIER_MAX_SJ_FILES = 10;
