/** Spreadsheet [OCR] Master Data Supplier — mapping kode & alias nama. */
export const SUPPLIER_MASTER_DATA_SHEET_ID = "1XpzArOeKwwBq1un_hewv6ffG7UImgdPo1EEdJSXfv5c";

export const SUPPLIER_MASTER_DATA_TAB = "Sheet1";

export const SUPPLIER_MASTER_DATA_HEADERS = [
  "Tipe Supplier",
  "Kode",
  "Nama Supplier",
] as const;

export function getSupplierMasterDataSheetId(): string {
  return process.env.SUPPLIER_MASTER_DATA_SHEET_ID?.trim() || SUPPLIER_MASTER_DATA_SHEET_ID;
}

export function getSupplierMasterDataTabName(): string {
  return process.env.SUPPLIER_MASTER_DATA_TAB?.trim() || SUPPLIER_MASTER_DATA_TAB;
}
