-- AlterTable
ALTER TABLE "OcrJob" ADD COLUMN     "progressMessage" TEXT,
ADD COLUMN     "progressPercent" INTEGER NOT NULL DEFAULT 0;
