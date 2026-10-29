import { prisma } from "@/lib/db";
import type { OcrDocumentResult } from "@/lib/providers/types";
import { getStorageProvider } from "@/lib/providers/storage/local-storage";
import {
  appendRowsToSheet,
  buildGoogleSheetRows,
  buildSuratJalanFileName,
  getGoogleExportConfigOptional,
  isGoogleExportConfigured,
  parseGeminiPayloadFromStructured,
  uploadFileToDrive,
} from "@/lib/providers/google-workspace";
import type { GeminiSJPayload } from "@/lib/providers/ocr/gemini-surat-jalan";
import { writeAuditLog } from "@/lib/services/audit";

const DRIVE_QUOTA_HINT =
  "Upload Drive gagal: service account tidak punya kuota di folder My Drive. " +
  "Solusi: (1) set GOOGLE_WORKSPACE_DELEGATED_USER=email Workspace + domain-wide delegation, " +
  "atau (2) pindahkan folder ke Shared Drive (Team Drive). Spreadsheet tetap bisa jalan tanpa ini.";

export async function exportDocumentToGoogleAfterOcr(params: {
  documentId: string;
  ocrResult: OcrDocumentResult;
  structuredOutput: object;
}) {
  await runGoogleExport(params.documentId, {
    ocrResult: params.ocrResult,
    structuredOutput: params.structuredOutput,
  });
}

export async function runGoogleExport(
  documentId: string,
  options?: {
    force?: boolean;
    ocrResult?: OcrDocumentResult;
    structuredOutput?: object;
  }
) {
  if (!isGoogleExportConfigured()) {
    await markExportError(documentId, "Google export nonaktif — GOOGLE_EXPORT_ENABLED=true di .env");
    return;
  }

  const doc = await prisma.suratJalanDocument.findUniqueOrThrow({
    where: { id: documentId },
    include: {
      images: { orderBy: { pageNumber: "asc" }, take: 1 },
      ocrJobs: {
        where: { status: { in: ["COMPLETED", "MANUAL"] } },
        orderBy: { completedAt: "desc" },
        take: 1,
      },
    },
  });

  if (doc.googleSheetExportedAt && !options?.force) {
    return;
  }

  const config = getGoogleExportConfigOptional();
  if (!config) return;

  const job = doc.ocrJobs[0];
  const structured =
    options?.structuredOutput ??
    (job?.structuredOutput as object | undefined) ??
    ({} as object);

  let ocrResult = options?.ocrResult;
  if (!ocrResult && job?.structuredOutput) {
    ocrResult = job.structuredOutput as unknown as OcrDocumentResult;
  }
  if (!ocrResult) {
    await markExportError(documentId, "Belum ada hasil OCR — jalankan OCR dulu");
    return;
  }
  if (ocrResult.isDemo) {
    await markExportError(documentId, "Demo OCR tidak di-export ke Google");
    return;
  }

  const image = doc.images[0];
  if (!image) {
    await markExportError(doc.id, "Tidak ada gambar untuk upload Drive");
    return;
  }

  let payload = parseGeminiPayloadFromStructured(structured);
  if (!payload) {
    payload = buildPayloadFallback(ocrResult, doc);
  }

  const tanggalForName = payload.tanggal || doc.documentDate?.toISOString().slice(0, 10) || "";
  const noSj = payload.no_surat_jalan || doc.suratJalanNumber || "UNKNOWN";
  const ext = image.originalFilename.match(/\.[a-z0-9]+$/i)?.[0] || ".jpeg";
  const fileName = buildSuratJalanFileName({
    tanggal: tanggalForName,
    noSuratJalan: noSj,
    ext,
  });

  let fileId: string | null = doc.googleDriveFileId;
  let fileUrl = doc.googleDriveFileUrl ?? "";
  const driveErrors: string[] = [];

  if (!fileId || options?.force) {
    try {
      const storage = getStorageProvider();
      const buffer = await storage.readFile(image.storageKey);
      const uploaded = await uploadFileToDrive({
        config,
        buffer,
        fileName,
        mimeType: image.mimeType || "image/jpeg",
      });
      fileId = uploaded.fileId;
      fileUrl = uploaded.fileUrl;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Drive upload failed";
      driveErrors.push(message.includes("storage quota") ? DRIVE_QUOTA_HINT : message);
      fileUrl = fileUrl || `(Drive gagal — lihat app /api/documents/${doc.id}/image)`;
    }
  }

  try {
    const rows = buildGoogleSheetRows({
      payload,
      fileName,
      fileUrl,
      fallback: {
        suratJalanNumber: doc.suratJalanNumber,
        documentDate: doc.documentDate,
        vehicleInfo: doc.vehicleInfo,
        poReference: doc.poReference,
        destinationText: doc.destinationText,
      },
    });

    await appendRowsToSheet({ config, rows });

    const combinedError = driveErrors.length ? driveErrors.join(" ") : null;

    await prisma.suratJalanDocument.update({
      where: { id: doc.id },
      data: {
        googleDriveFileId: fileId,
        googleDriveFileUrl: fileUrl.startsWith("http") ? fileUrl : null,
        googleSheetExportedAt: new Date(),
        googleExportLastError: combinedError,
      },
    });

    await writeAuditLog({
      action: driveErrors.length ? "google.export.partial" : "google.export.completed",
      entityType: "SuratJalanDocument",
      entityId: doc.id,
      after: { fileId, rowCount: rows.length, driveErrors },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Google Sheet export failed";
    const full = [...driveErrors, message].filter(Boolean).join(" | ");
    await markExportError(doc.id, full || message);
    await writeAuditLog({
      action: "google.export.failed",
      entityType: "SuratJalanDocument",
      entityId: doc.id,
      after: { error: full || message },
    });
  }
}

async function markExportError(documentId: string, message: string) {
  await prisma.suratJalanDocument.update({
    where: { id: documentId },
    data: { googleExportLastError: message.slice(0, 2000) },
  });
}

function buildPayloadFallback(
  result: OcrDocumentResult,
  doc: {
    suratJalanNumber: string | null;
    documentDate: Date | null;
    vehicleInfo: string | null;
    poReference: string | null;
    destinationText: string | null;
  }
): GeminiSJPayload {
  let nama_penerima = "";
  let alamat = "";
  if (doc.destinationText) {
    const parts = doc.destinationText.split(" — ");
    if (parts.length >= 2) {
      nama_penerima = parts[0];
      alamat = parts.slice(1).join(" — ");
    } else {
      alamat = doc.destinationText;
    }
  }

  return {
    tanggal: doc.documentDate
      ? `${doc.documentDate.getDate().toString().padStart(2, "0")}/${(doc.documentDate.getMonth() + 1).toString().padStart(2, "0")}/${doc.documentDate.getFullYear()}`
      : undefined,
    no_surat_jalan: doc.suratJalanNumber || result.suratJalanNumber,
    no_kendaraan: doc.vehicleInfo || result.vehicleInfo,
    no_po: doc.poReference || result.poReference,
    nama_penerima,
    alamat,
    items: result.lineItems.map((line) => ({
      nama_barang: line.supplierProductName,
      jumlah_qty: line.quantity ? Number(line.quantity) : null,
      jumlah_satuan: line.unit,
      keterangan: line.extractionNotes,
      is_subtotal: false,
      ragu: (line.confidence ?? 1) < 0.75,
    })),
  };
}
