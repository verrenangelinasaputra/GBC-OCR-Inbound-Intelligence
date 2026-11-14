/** Spreadsheet master rekap SKU (tab REKAP SKUL) — legacy file. */
export const SKU_REKAP_SHEET_ID = "1QePx5At4B0SiDfeLU9s5N7vsz394Z7K1kElSPxxJmYE";

/** Spreadsheet generator SKU v2 (operasional baru) — dipakai jika env kosong di production v2. */
export const SKU_MASTER_SHEET_ID_DEFAULT = "1vbCQDgMRfUb8YKZ_E6DVHSa-lS7iWUAhylwImnJGJsw";

export const SKU_REKAP_TAB_NAME = "REKAP SKUL";

/** Google Sheets tab id for REKAP SKUL (gid in spreadsheet URL). */
export const SKU_REKAP_GID = 1147104169;

/** Alias OCR → SKU (jika tidak match fuzzy ke REKAP). */
export const MASTER_MAPPING_TAB_NAME = "Master Mapping";

/** Spreadsheet Data Barang Masuk (final DBM). */
export const DBM_INBOUND_SHEET_ID = "1QEXrV23W2xZnjrmaw8MJbJmfvprv5c4NoTZksTM91Tg";

export const DBM_INBOUND_TAB_NAME = "Data Barang Masuk";

export function getSkuRekapSheetId(): string {
  return process.env.SKU_REKAP_SHEET_ID?.trim() || SKU_REKAP_SHEET_ID;
}

/** Modul master produk — default spreadsheet v2; tidak mengubah default katalog lama. */
export function getSkuMasterSheetId(): string {
  return process.env.SKU_MASTER_SHEET_ID?.trim() || SKU_MASTER_SHEET_ID_DEFAULT;
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
