export type DbmInboundRecord = {
  exportedAt: string;
  confirmedBy: string;
  gudang: string;
  supplier: string;
  tanggalSj: string;
  noSj: string;
  namaBarangOcr: string;
  banyaknya: string;
  isi: string;
  jumlah: string;
  keterangan: string;
  sampleType: string;
  rowKey: string;
  docKey: string;
  matchScore: number;
  skuLengkap: string;
  namaInternalAccurate: string;
  namaProdukAcuan: string;
  kategoriUtama: string;
  skus: string;
  barcode: string;
  sumberLembar: string;
  linkSjDrive: string;
  /** Baris di spreadsheet DBM (1-based), untuk update setelah ekspor Accurate. */
  sheetRow: number;
  accurateExportTag: string;
  accurateExportedAt: string;
};

export type DbmShipmentAttachment = {
  docKey: string;
  rowKey: string;
  tanggalSj: string;
  noSj: string;
  supplier: string;
  gudang: string;
  jumlah: string;
  jumlahAmount: number;
  jumlahUnit: string;
  linkSjDrive: string;
  ocrReviewPath: string;
};

export type DbmInboundAggregate = {
  aggregateKey: string;
  merged: boolean;
  namaProdukAcuan: string;
  skuLengkap: string;
  namaBarangOcr: string;
  kategoriUtama: string;
  skus: string;
  totalAmount: number;
  unit: string;
  shipmentCount: number;
  shipments: DbmShipmentAttachment[];
};
