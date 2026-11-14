export type SkuMasterCodeOption = {
  code: string;
  label: string;
  sheetRow: number;
};

export type SkuMasterProductInput = {
  categoryTab: string;
  namaProdukAcuan: string;
  namaInternalAccurate: string;
  sub1: string;
  sub2: string;
  sub3: string;
  sub4: string;
  sub5: string;
  sub6: string;
  sub7: string;
  sub8: string;
  sub9: string;
};

export type SkuMasterProductUpdateInput = SkuMasterProductInput & {
  sheetRow: number;
  oldSkuLengkap?: string;
};

export type SkuMasterProductDeleteInput = {
  categoryTab: string;
  sheetRow: number;
  skuLengkap?: string;
};

export type SkuMasterProductResult = {
  categoryTab: string;
  sheetRow: number;
  rowNo: string;
  skuLengkap: string;
  skus: string;
  barcode: string;
  barcodeDisplay: string;
  namaProdukAcuan: string;
  namaInternalAccurate: string;
  kategoriUtama: string;
  rekapSkulRow?: number;
  rekapSkusUpdated: boolean;
};

export type SkuMasterSyncSummary = {
  spreadsheetId: string;
  codes: number;
  rekapSkul: number;
  rekapSkus: number;
  dbPersisted: boolean;
};

export type SkuMasterTableRow = {
  categoryTab: string;
  sheetRow: number;
  no: string;
  namaProdukAcuan: string;
  namaInternalAccurate: string;
  sub1: string;
  sub2: string;
  sub3: string;
  sub4: string;
  sub5: string;
  sub6: string;
  sub7: string;
  sub8: string;
  sub9: string;
  skuLengkap: string;
  skus: string;
  barcode: string;
};

export type SkuMasterRekapSkulRow = {
  rowNo: string;
  skuLengkap: string;
  namaInternalAccurate: string;
  namaProdukAcuan: string;
  kategoriUtama: string;
  skus: string;
  barcode: string;
  sumberLembar: string;
};

export type SkuMasterRekapSkusRow = {
  rowNo: string;
  skus: string;
  namaInternal: string;
  variantCount: number;
  sourceTab: string;
};