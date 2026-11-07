import { getGoogleExportConfigOptional } from "@/lib/providers/google-workspace";
import { resolveAndDownloadSuratJalanImage } from "@/lib/providers/google-workspace/client";
import { getOcrSheetDocumentDetail } from "@/lib/services/ocr-sheet-detail";

export async function getOcrSheetDocumentImage(docKey: string) {
  const config = getGoogleExportConfigOptional();
  if (!config) throw new Error("Google export tidak dikonfigurasi");

  const doc = await getOcrSheetDocumentDetail(docKey);
  const fileName = doc.fileName.trim();
  const fileUrl = doc.fileUrl.trim();
  if (!fileName && !fileUrl) {
    throw new Error("Sheet belum punya nama file atau link Drive");
  }

  return resolveAndDownloadSuratJalanImage({
    config,
    fileUrl,
    fileName,
  });
}
