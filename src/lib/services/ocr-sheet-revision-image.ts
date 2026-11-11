import { parseDriveFileId, downloadDriveFile } from "@/lib/providers/google-workspace/client";
import { getGoogleExportConfigOptional } from "@/lib/providers/google-workspace";
import { parseRevisionLinks } from "@/lib/surat-jalan/revision-links";
import { getOcrSheetDocumentDetail } from "@/lib/services/ocr-sheet-detail";

export async function getOcrSheetRevisionImage(
  docKey: string,
  index: number
): Promise<{ buffer: Buffer; mimeType: string }> {
  const config = getGoogleExportConfigOptional();
  if (!config) throw new Error("Google export tidak dikonfigurasi");

  const doc = await getOcrSheetDocumentDetail(docKey);
  const links = parseRevisionLinks(doc.linkRevisi);
  if (!links.length) throw new Error("Belum ada gambar revisi");

  const idx = index < 0 ? links.length - 1 : index;
  const url = links[idx];
  if (!url) throw new Error("Indeks revisi tidak valid");

  const fileId = parseDriveFileId(url);
  if (!fileId) throw new Error("Link revisi tidak valid");

  const downloaded = await downloadDriveFile({ config, fileId });
  return { buffer: downloaded.buffer, mimeType: downloaded.mimeType || "image/png" };
}
