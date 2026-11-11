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
} from "@/lib/services/ocr-sheet-detail";
import { setOcrDocumentReviewStatus } from "@/lib/services/ocr-sheet-review";
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
    requirePermission(session.roles, "ocr_review", "EDIT");
    const { key } = await context.params;
    const body = await request.json();
    const decision = String(body.decision ?? "").trim().toLowerCase();
    if (decision !== "approve" && decision !== "reject") {
      return jsonError(new Error("decision harus approve atau reject"), 400);
    }

    const header = body.header as OcrSheetHeaderPatch | undefined;
    const lines = Array.isArray(body.lines) ? (body.lines as OcrSheetLinePatch[]) : undefined;
    await saveOcrSheetDocumentEdits({ docKey: key, header, lines });

    const doc = await getOcrSheetDocumentDetail(key);
    const config = getGoogleExportConfigOptional();
    if (!config) return jsonError(new Error("Google export tidak dikonfigurasi"), 503);

    if (decision === "approve") {
      await setOcrDocumentReviewStatus({ docKey: key, status: "TERVERIFIKASI_DISETUJUI" });
      return Response.json({ ok: true, status: "TERVERIFIKASI_DISETUJUI" });
    }

    const png = await renderSuratJalanRevisionPng(doc);
    const fileName = revisionFileName(doc.fileName || `SuratJalan_${doc.noSuratJalan}.png`);
    const subfolder = buildSuratJalanDriveSubfolderName({
      tanggal: doc.tanggal,
      noSuratJalan: doc.noSuratJalan,
      supplierName: doc.supplier || "Supplier",
    });

    const uploaded = await uploadSuratJalanToGudangDrive({
      config,
      buffer: png,
      fileName,
      mimeType: "image/png",
      gudang: doc.gudang,
      subfolderName: subfolder,
    });

    await setOcrDocumentReviewStatus({
      docKey: key,
      status: "TIDAK_SESUAI_KONFIRMASI",
      linkRevisi: uploaded.fileUrl,
    });

    return Response.json({
      ok: true,
      status: "TIDAK_SESUAI_KONFIRMASI",
      revisionUrl: uploaded.fileUrl,
    });
  } catch (e) {
    return jsonError(e);
  }
}
