import { jsonError, requireApiSession } from "@/lib/api/auth-context";
import { requirePermission } from "@/lib/rbac/permissions";
import { isSheetOnlyMode } from "@/lib/config/app-mode";
import { hasDatabase } from "@/lib/db";
import { getGoogleExportConfigOptional } from "@/lib/providers/google-workspace";
import {
  buildSuratJalanDriveSubfolderName,
  uploadSuratJalanToGudangDrive,
} from "@/lib/providers/google-workspace";
import {
  getOcrSheetDocumentDetail,
  saveOcrSheetDocumentEdits,
  type OcrSheetHeaderPatch,
  type OcrSheetLinePatch,
  type OcrSheetNewLineInput,
} from "@/lib/services/ocr-sheet-detail";
import { setOcrDocumentReviewStatus } from "@/lib/services/ocr-sheet-review";
import { appendRevisionLink, parseRevisionLinks, revisionLinkCount } from "@/lib/surat-jalan/revision-links";
import { mirrorRevisionToSupplierDrive } from "@/lib/surat-jalan/mirror-revision-drive";
import { renderSuratJalanRevisionPng, revisionFileName } from "@/lib/surat-jalan/revision-image";

function sheetReviewEnabled(): boolean {
  return isSheetOnlyMode() || !hasDatabase();
}

export async function POST(request: Request, context: { params: Promise<{ key: string }> }) {
  if (!sheetReviewEnabled()) {
    return jsonError(new Error("Mode spreadsheet tidak aktif"), 404);
  }
  try {
    const session = await requireApiSession();
    requirePermission(session.roles, "ocr_review", "EDIT", session.allowedModules);
    const { key } = await context.params;
    const body = await request.json();
    const decision = String(body.decision ?? "").trim().toLowerCase();
    if (decision !== "approve" && decision !== "reject") {
      return jsonError(new Error("decision harus approve atau reject"), 400);
    }

    const header = body.header as OcrSheetHeaderPatch | undefined;
    const lines = Array.isArray(body.lines) ? (body.lines as OcrSheetLinePatch[]) : undefined;
    const newLines = Array.isArray(body.newLines) ? (body.newLines as OcrSheetNewLineInput[]) : undefined;
    const deleteSheetRows = Array.isArray(body.deleteSheetRows)
      ? (body.deleteSheetRows as number[])
      : undefined;
    await saveOcrSheetDocumentEdits({ docKey: key, header, lines, newLines, deleteSheetRows });

    const docBefore = await getOcrSheetDocumentDetail(key);
    const config = getGoogleExportConfigOptional();
    if (!config) return jsonError(new Error("Google export tidak dikonfigurasi"), 503);

    if (decision === "approve") {
      await setOcrDocumentReviewStatus({ docKey: key, status: "TERVERIFIKASI_DISETUJUI" });
      return Response.json({ ok: true, status: "TERVERIFIKASI_DISETUJUI" });
    }

    const nextSeq = revisionLinkCount(docBefore.linkRevisi) + 1;
    const png = await renderSuratJalanRevisionPng(docBefore, nextSeq);
    const fileName = revisionFileName(docBefore.fileName || `SuratJalan_${docBefore.noSuratJalan}.png`, nextSeq);
    const subfolder = buildSuratJalanDriveSubfolderName({
      tanggal: docBefore.tanggal,
      noSuratJalan: docBefore.noSuratJalan,
      supplierName: docBefore.supplier || "Supplier",
    });

    const uploaded = await uploadSuratJalanToGudangDrive({
      config,
      buffer: png,
      fileName,
      mimeType: "image/png",
      gudang: docBefore.gudang,
      subfolderName: subfolder,
    });

    let supplierMirrorWarning: string | undefined;
    try {
      await mirrorRevisionToSupplierDrive({
        config,
        doc: docBefore,
        buffer: png,
        fileName,
      });
    } catch (mirrorErr) {
      supplierMirrorWarning =
        mirrorErr instanceof Error ? mirrorErr.message : "Mirror revisi ke Drive supplier gagal";
    }

    const mergedLinks = appendRevisionLink(docBefore.linkRevisi, uploaded.fileUrl);

    await setOcrDocumentReviewStatus({
      docKey: key,
      status: "MENUNGGU_REVISI_SUPPLIER",
      linkRevisi: mergedLinks,
    });

    return Response.json({
      ok: true,
      status: "MENUNGGU_REVISI_SUPPLIER",
      revisionUrl: uploaded.fileUrl,
      revisionSequence: nextSeq,
      revisionLinks: parseRevisionLinks(mergedLinks),
      supplierMirrorWarning,
    });
  } catch (e) {
    return jsonError(e);
  }
}
