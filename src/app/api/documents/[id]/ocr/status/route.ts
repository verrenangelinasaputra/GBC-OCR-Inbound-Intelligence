import { prisma } from "@/lib/db";
import { requireApiPermission, jsonError } from "@/lib/api/auth-context";
import { OcrJobStatus } from "@prisma/client";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await requireApiPermission("ocr_review", "VIEW");
    const { id: documentId } = await context.params;

    const doc = await prisma.suratJalanDocument.findUnique({
      where: { id: documentId },
      select: {
        status: true,
        googleSheetExportedAt: true,
        _count: { select: { lineItems: true } },
      },
    });
    if (!doc) return jsonError(new Error("Document not found"), 404);

    const activeJob = await prisma.ocrJob.findFirst({
      where: {
        documentId,
        status: { in: [OcrJobStatus.PENDING, OcrJobStatus.PROCESSING] },
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        status: true,
        progressPercent: true,
        progressMessage: true,
        startedAt: true,
        createdAt: true,
        providerKey: true,
      },
    });

    const latestJob = await prisma.ocrJob.findFirst({
      where: { documentId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        status: true,
        progressPercent: true,
        progressMessage: true,
        errorMessage: true,
        completedAt: true,
      },
    });

    const running = !!activeJob;
    const done =
      latestJob &&
      (latestJob.status === OcrJobStatus.COMPLETED ||
        latestJob.status === OcrJobStatus.MANUAL ||
        latestJob.status === OcrJobStatus.FAILED);

    return Response.json({
      documentStatus: doc.status,
      lineCount: doc._count.lineItems,
      googleExported: !!doc.googleSheetExportedAt,
      running,
      activeJob,
      latestJob,
      finished: done && !running,
    });
  } catch (e) {
    return jsonError(e);
  }
}
