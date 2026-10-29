import { OcrJobStatus, SuratJalanStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getOCRProvider } from "@/lib/providers/ocr";
import { getStorageProvider } from "@/lib/providers/storage/local-storage";
import { canTransition, transitionDocumentStatus } from "@/lib/workflow/document-workflow";
import { writeAuditLog } from "@/lib/services/audit";
import { exportDocumentToGoogleAfterOcr } from "@/lib/services/google-export-service";
import { findProductMatches, requiresHumanReview } from "@/lib/services/product-matching";
import { MappingStatus } from "@prisma/client";
import { updateOcrProgress } from "@/lib/services/ocr-progress";

async function safeTransition(
  documentId: string,
  to: SuratJalanStatus,
  actorId: string | undefined,
  reason: string
) {
  const doc = await prisma.suratJalanDocument.findUniqueOrThrow({ where: { id: documentId } });
  if (doc.status === to) return true;
  if (canTransition(doc.status, to)) {
    await transitionDocumentStatus({ documentId, to, actorId, reason });
    return true;
  }
  return false;
}

const STALE_OCR_MS = 4 * 60 * 1000;

export async function enqueueOcrJob(
  documentId: string,
  actorId?: string,
  options?: { waitForCompletion?: boolean }
) {
  const waitForCompletion = options?.waitForCompletion ?? false;
  const inFlight = await prisma.ocrJob.findFirst({
    where: {
      documentId,
      status: { in: [OcrJobStatus.PENDING, OcrJobStatus.PROCESSING] },
    },
    orderBy: { createdAt: "desc" },
  });
  if (inFlight) {
    const started = inFlight.startedAt ?? inFlight.createdAt;
    const ageMs = Date.now() - started.getTime();
    if (ageMs < STALE_OCR_MS) {
      return inFlight;
    }
    await prisma.ocrJob.update({
      where: { id: inFlight.id },
      data: {
        status: OcrJobStatus.FAILED,
        errorMessage: "Job stale — dibatalkan untuk retry baru",
        completedAt: new Date(),
      },
    });
  }

  const idempotencyKey = `ocr-${documentId}-${Date.now()}`;

  const job = await prisma.ocrJob.create({
    data: {
      documentId,
      status: OcrJobStatus.PENDING,
      providerKey: process.env.OCR_PROVIDER ?? "demo",
      idempotencyKey,
      progressPercent: 5,
      progressMessage: "Antrian OCR…",
    },
  });

  await safeTransition(documentId, SuratJalanStatus.QUEUED_FOR_OCR, actorId, "OCR job created");

  if (waitForCompletion) {
    await processOcrJob(job.id, actorId);
  } else {
    void processOcrJob(job.id, actorId);
  }
  return job;
}

export async function processOcrJob(jobId: string, actorId?: string) {
  const job = await prisma.ocrJob.findUniqueOrThrow({
    where: { id: jobId },
    include: { document: { include: { images: true } } },
  });

  await prisma.ocrJob.update({
    where: { id: jobId },
    data: {
      status: OcrJobStatus.PROCESSING,
      startedAt: new Date(),
      progressPercent: 12,
      progressMessage: "Membaca file gambar…",
    },
  });
  await safeTransition(job.documentId, SuratJalanStatus.PROCESSING, actorId, "OCR processing");

  const storage = getStorageProvider();
  const images = [...job.document.images].sort((a, b) => a.pageNumber - b.pageNumber);
  if (images.length === 0) {
    await prisma.ocrJob.update({
      where: { id: jobId },
      data: {
        status: OcrJobStatus.FAILED,
        errorMessage: "No image attached",
        completedAt: new Date(),
      },
    });
    return;
  }

  try {
    const provider = getOCRProvider();
    let result = null as Awaited<ReturnType<typeof provider.processImage>> | null;

    for (let pi = 0; pi < images.length; pi++) {
      const image = images[pi];
      const pageLabel =
        images.length > 1 ? ` (halaman ${pi + 1}/${images.length})` : "";
      await updateOcrProgress(
        jobId,
        20 + Math.floor((pi / Math.max(images.length, 1)) * 15),
        `Membaca gambar${pageLabel}…`
      );
      const buffer = await storage.readFile(image.storageKey);
      await updateOcrProgress(
        jobId,
        35 + Math.floor((pi / Math.max(images.length, 1)) * 30),
        `Gemini Vision — ekstraksi teks${pageLabel}…`
      );
      const pageResult = await provider.processImage(buffer, image.mimeType);
      if (!result) {
        result = pageResult;
        continue;
      }
      const offset = result.lineItems.length;
      result = {
        ...result,
        lineItems: [
          ...result.lineItems,
          ...pageResult.lineItems.map((l) => ({
            ...l,
            lineNumber: offset + l.lineNumber,
            pageNumber: image.pageNumber,
          })),
        ],
        warnings: [...result.warnings, ...pageResult.warnings],
        rawText: [result.rawText, pageResult.rawText].filter(Boolean).join("\n---\n"),
      };
      if (!result.suratJalanNumber && pageResult.suratJalanNumber) {
        result.suratJalanNumber = pageResult.suratJalanNumber;
      }
    }

    if (!result) throw new Error("OCR tidak menghasilkan data");

    await updateOcrProgress(jobId, 72, "Menyimpan header & barang ke database…");

    const threshold = parseFloat(process.env.OCR_CONFIDENCE_THRESHOLD ?? "0.75");
    const needsReview =
      result.isDemo ||
      (result.confidenceScore ?? 0) < threshold ||
      result.warnings.length > 0;

    await prisma.ocrJob.update({
      where: { id: jobId },
      data: {
        rawOutput: { rawText: result.rawText },
        structuredOutput: result as object,
        confidenceScore: result.confidenceScore,
        warnings: result.warnings,
        progressPercent: 75,
        progressMessage: "Menyimpan hasil OCR…",
      },
    });

    await prisma.suratJalanDocument.update({
      where: { id: job.documentId },
      data: {
        suratJalanNumber: result.suratJalanNumber,
        documentDate: result.documentDate ? new Date(result.documentDate) : undefined,
        destinationText: result.destination,
        poReference: result.poReference,
        vehicleInfo: result.vehicleInfo,
        totalItemCount: result.totalItemCount,
      },
    });

    const headerFields: Array<[string, string | undefined]> = [
      ["surat_jalan_number", result.suratJalanNumber],
      ["document_date", result.documentDate],
      ["supplier_name", result.supplierName],
      ["destination", result.destination],
      ["po_reference", result.poReference],
      ["vehicle_info", result.vehicleInfo],
    ];
    for (const [key, val] of headerFields) {
      if (!val) continue;
      await prisma.ocrExtractedField.upsert({
        where: { documentId_fieldKey: { documentId: job.documentId, fieldKey: key } },
        create: {
          documentId: job.documentId,
          fieldKey: key,
          rawValue: val,
          confidence: result.confidenceScore,
          needsReview: needsReview,
          source: result.isDemo ? "demo" : "ocr",
        },
        update: { rawValue: val, needsReview },
      });
    }

    await prisma.ocrLineItem.deleteMany({ where: { documentId: job.documentId } });
    await updateOcrProgress(jobId, 82, "Mapping SKU otomatis…");
    for (const line of result.lineItems) {
      const created = await prisma.ocrLineItem.create({
        data: {
          documentId: job.documentId,
          lineNumber: line.lineNumber,
          pageNumber: line.pageNumber,
          supplierProductName: line.supplierProductName,
          supplierProductCode: line.supplierProductCode,
          quantityRaw: line.quantity,
          unitRaw: line.unit,
          unitPriceRaw: line.unitPrice,
          lineTotalRaw: line.lineTotal,
          confidence: line.confidence,
          needsReview: line.confidence != null ? line.confidence < 0.75 : true,
        },
      });
      const docSupplierId = job.document.supplierId;
      const candidates = await findProductMatches({
        supplierId: docSupplierId,
        supplierProductName: line.supplierProductName ?? "",
        supplierProductCode: line.supplierProductCode,
      });
      if (
        candidates[0]?.matchType === "exact_code" &&
        !requiresHumanReview(candidates)
      ) {
        await prisma.ocrLineItem.update({
          where: { id: created.id },
          data: {
            internalProductId: candidates[0].internalProductId,
            mappingId: candidates[0].mappingId,
            mappingStatus: MappingStatus.VERIFIED,
          },
        });
      }
    }

    const nextStatus = needsReview
      ? SuratJalanStatus.NEEDS_REVIEW
      : SuratJalanStatus.OCR_COMPLETED;
    await safeTransition(
      job.documentId,
      nextStatus,
      actorId,
      result.isDemo ? "Demo OCR completed" : "OCR completed"
    );

    await writeAuditLog({
      actorId,
      action: "ocr.completed",
      entityType: "OcrJob",
      entityId: jobId,
      after: { provider: result.providerKey, isDemo: result.isDemo },
    });

    if (process.env.GOOGLE_EXPORT_ENABLED === "true" && !result.isDemo) {
      await updateOcrProgress(jobId, 92, "Export ke Google Drive & Sheet…");
    }
    await exportDocumentToGoogleAfterOcr({
      documentId: job.documentId,
      ocrResult: result,
      structuredOutput: result as object,
    });

    await prisma.ocrJob.update({
      where: { id: jobId },
      data: {
        status: result.lineItems.length ? OcrJobStatus.COMPLETED : OcrJobStatus.MANUAL,
        completedAt: new Date(),
        progressPercent: 100,
        progressMessage: "Selesai",
      },
    });
  } catch (err) {
    await prisma.ocrJob.update({
      where: { id: jobId },
      data: {
        status: OcrJobStatus.FAILED,
        errorMessage: err instanceof Error ? err.message : "Unknown error",
        completedAt: new Date(),
        progressPercent: 0,
        progressMessage: "Gagal",
      },
    });
    await safeTransition(
      job.documentId,
      SuratJalanStatus.NEEDS_REVIEW,
      actorId,
      "OCR failed — manual review"
    );
  }
}
