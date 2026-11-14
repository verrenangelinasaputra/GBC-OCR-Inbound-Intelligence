import type { GoogleExportConfig } from "@/lib/providers/google-workspace/config";
import { buildSuratJalanDriveSubfolderName, uploadSuratJalanToGudangDrive } from "@/lib/providers/google-workspace";
import { resolveSupplierUploadMapping } from "@/lib/services/supplier-upload-mapping";
import { isSupplierMasterUsername } from "@/lib/supplier-auth/master-admin";
import { resolveSupplierUsername } from "@/lib/supplier-auth/resolve-username";
import { getSupplierDriveSettings } from "@/lib/supplier-auth/supplier-drive-settings";
import type { OcrSheetDocumentDetail } from "@/lib/services/ocr-sheet-detail";

export async function mirrorRevisionToSupplierDrive(params: {
  config: GoogleExportConfig;
  doc: OcrSheetDocumentDetail;
  buffer: Buffer;
  fileName: string;
}): Promise<string | undefined> {
  const user = await resolveSupplierUsername(params.doc.supplier);
  if (!user || isSupplierMasterUsername(user)) return undefined;

  const settings = await getSupplierDriveSettings(user);
  if (!settings?.mirrorEnabled || !settings.driveRootFolderId) return undefined;

  const supplierName = params.doc.supplier?.trim() || "";
  const supplierMapping = await resolveSupplierUploadMapping({ supplierName });
  const subfolder = buildSuratJalanDriveSubfolderName({
    tanggal: params.doc.tanggal,
    noSuratJalan: params.doc.noSuratJalan,
    supplierName: supplierName || "Supplier",
  });

  await uploadSuratJalanToGudangDrive({
    config: params.config,
    rootFolderId: settings.driveRootFolderId,
    buffer: params.buffer,
    fileName: params.fileName,
    mimeType: "image/png",
    gudang: params.doc.gudang,
    subfolderName: subfolder,
    supplierFolderName: supplierMapping?.supplierFolderName,
  });
  return user;
}
