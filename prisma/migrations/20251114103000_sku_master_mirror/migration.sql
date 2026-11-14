-- CreateTable
CREATE TABLE "SkuMasterCode" (
    "id" TEXT NOT NULL,
    "spreadsheetId" TEXT NOT NULL,
    "categoryTab" TEXT NOT NULL,
    "subIndex" INTEGER NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT,
    "sheetRow" INTEGER,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SkuMasterCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SkuMasterCatalogLine" (
    "id" TEXT NOT NULL,
    "spreadsheetId" TEXT NOT NULL,
    "rowNo" TEXT NOT NULL,
    "skuLengkap" TEXT NOT NULL,
    "namaInternalAccurate" TEXT,
    "namaProdukAcuan" TEXT,
    "kategoriUtama" TEXT,
    "skus" TEXT,
    "barcode" TEXT,
    "sumberLembar" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SkuMasterCatalogLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SkuMasterSkusFamily" (
    "id" TEXT NOT NULL,
    "spreadsheetId" TEXT NOT NULL,
    "skus" TEXT NOT NULL,
    "namaInternal" TEXT,
    "variantCount" INTEGER NOT NULL DEFAULT 0,
    "sourceTab" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SkuMasterSkusFamily_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SkuMasterCode_spreadsheetId_categoryTab_subIndex_idx" ON "SkuMasterCode"("spreadsheetId", "categoryTab", "subIndex");

-- CreateIndex
CREATE UNIQUE INDEX "SkuMasterCode_spreadsheetId_categoryTab_subIndex_code_key" ON "SkuMasterCode"("spreadsheetId", "categoryTab", "subIndex", "code");

-- CreateIndex
CREATE INDEX "SkuMasterCatalogLine_spreadsheetId_namaProdukAcuan_idx" ON "SkuMasterCatalogLine"("spreadsheetId", "namaProdukAcuan");

-- CreateIndex
CREATE INDEX "SkuMasterCatalogLine_spreadsheetId_skus_idx" ON "SkuMasterCatalogLine"("spreadsheetId", "skus");

-- CreateIndex
CREATE UNIQUE INDEX "SkuMasterCatalogLine_spreadsheetId_skuLengkap_key" ON "SkuMasterCatalogLine"("spreadsheetId", "skuLengkap");

-- CreateIndex
CREATE UNIQUE INDEX "SkuMasterSkusFamily_spreadsheetId_skus_key" ON "SkuMasterSkusFamily"("spreadsheetId", "skus");