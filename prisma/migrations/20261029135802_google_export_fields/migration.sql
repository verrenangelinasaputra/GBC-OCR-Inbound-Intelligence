-- AlterTable
ALTER TABLE "SuratJalanDocument" ADD COLUMN     "googleDriveFileId" TEXT,
ADD COLUMN     "googleDriveFileUrl" TEXT,
ADD COLUMN     "googleExportLastError" TEXT,
ADD COLUMN     "googleSheetExportedAt" TIMESTAMP(3);
