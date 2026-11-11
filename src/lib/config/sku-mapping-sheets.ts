/** Spreadsheet master rekap SKU (tab REKAP SKUL). */
export const SKU_REKAP_SHEET_ID = "1QePx5At4B0SiDfeLU9s5N7vsz394Z7K1kElSPxxJmYE";

export const SKU_REKAP_TAB_NAME = "REKAP SKUL";

/** Spreadsheet Data Barang Masuk (final DBM). */
export const DBM_INBOUND_SHEET_ID = "1QEXrV23W2xZnjrmaw8MJbJmfvprv5c4NoTZksTM91Tg";

export const DBM_INBOUND_TAB_NAME = "Data Barang Masuk";

export function getSkuRekapSheetId(): string {
  return process.env.SKU_REKAP_SHEET_ID?.trim() || SKU_REKAP_SHEET_ID;
}

export function getSkuRekapTabName(): string {
  return process.env.SKU_REKAP_TAB?.trim() || SKU_REKAP_TAB_NAME;
}

export function getDbmInboundSheetId(): string {
  return process.env.DBM_INBOUND_SHEET_ID?.trim() || DBM_INBOUND_SHEET_ID;
}

export function getDbmInboundTabName(): string {
  return process.env.DBM_INBOUND_TAB?.trim() || DBM_INBOUND_TAB_NAME;
}
