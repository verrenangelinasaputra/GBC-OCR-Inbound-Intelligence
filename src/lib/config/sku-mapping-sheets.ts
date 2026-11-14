/** Spreadsheet legacy (hanya jika masih perlu baca file lama via env). */
export const SKU_REKAP_SHEET_ID_LEGACY = "1QePx5At4B0SiDfeLU9s5N7vsz394Z7K1kElSPxxJmYE";

/** Spreadsheet generator SKU v2 — sumber tunggal TABEL + REKAP SKUL/SKUS. */
export const SKU_MASTER_SHEET_ID_DEFAULT = "1vbCQDgMRfUb8YKZ_E6DVHSa-lS7iWUAhylwImnJGJsw";

export const SKU_REKAP_TAB_NAME = "REKAP SKUL";

/** Google Sheets tab id REKAP SKUL pada spreadsheet v2. */
export const SKU_REKAP_GID = 1147104168;

/** Alias OCR → SKU (jika tidak match fuzzy ke REKAP). */
export const MASTER_MAPPING_TAB_NAME = "Master Mapping";

/** Spreadsheet Data Barang Masuk (final DBM). */
export const DBM_INBOUND_SHEET_ID = "1QEXrV23W2xZnjrmaw8MJbJmfvprv5c4NoTZksTM91Tg";

export const DBM_INBOUND_TAB_NAME = "Data Barang Masuk";

/** Modul master produk — default spreadsheet v2. */
export function getSkuMasterSheetId(): string {
  return process.env.SKU_MASTER_SHEET_ID?.trim() || SKU_MASTER_SHEET_ID_DEFAULT;
}

/**
 * Katalog REKAP SKUL untuk `/sku-mapping` — default sama dengan master v2.
 * Set `SKU_REKAP_SHEET_ID` hanya jika katalog masih di file legacy.
 */
export function getSkuRekapSheetId(): string {
  const fromEnv = process.env.SKU_REKAP_SHEET_ID?.trim();
  if (fromEnv) return fromEnv;
  return getSkuMasterSheetId();
}

export function getSkuRekapTabName(): string {
  return process.env.SKU_REKAP_TAB?.trim() || SKU_REKAP_TAB_NAME;
}

/** Direct link to REKAP SKUL tab (SKU generator / master catalog). */
export function getSkuRekapSpreadsheetEditUrl(): string {
  const sheetId = getSkuRekapSheetId();
  const gidRaw = process.env.SKU_REKAP_GID?.trim();
  const gid = gidRaw && /^\d+$/.test(gidRaw) ? gidRaw : String(SKU_REKAP_GID);
  return `https://docs.google.com/spreadsheets/d/${sheetId}/edit?pli=1&gid=${gid}#gid=${gid}`;
}

export function getMasterMappingTabName(): string {
  return process.env.MASTER_MAPPING_TAB?.trim() || MASTER_MAPPING_TAB_NAME;
}

export function getDbmInboundSheetId(): string {
  return process.env.DBM_INBOUND_SHEET_ID?.trim() || DBM_INBOUND_SHEET_ID;
}

export function getDbmInboundTabName(): string {
  return process.env.DBM_INBOUND_TAB?.trim() || DBM_INBOUND_TAB_NAME;
}
