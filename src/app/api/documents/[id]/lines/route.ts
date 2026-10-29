import { prisma } from "@/lib/db";
import { requireApiPermission, jsonError } from "@/lib/api/auth-context";
import { writeAuditLog } from "@/lib/services/audit";
import { serializeOcrLineItems } from "@/lib/serialize/ocr-line-items";
import { toClientJson } from "@/lib/serialize/client-json";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await requireApiPermission("ocr_review", "VIEW");
    const { id: documentId } = await context.params;
    const lines = await prisma.ocrLineItem.findMany({
      where: { documentId },
      include: { internalProduct: true },
      orderBy: { lineNumber: "asc" },
    });
    return Response.json({ lines: toClientJson(serializeOcrLineItems(lines)) });
  } catch (e) {
    return jsonError(e);
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireApiPermission("ocr_review", "EDIT");
    const { id: documentId } = await context.params;
    const body = await request.json();
    const lineId = String(body.lineId);

    const before = await prisma.ocrLineItem.findFirst({ where: { id: lineId, documentId } });
    if (!before) return jsonError(new Error("Line not found"), 404);

    const updated = await prisma.ocrLineItem.update({
      where: { id: lineId },
      data: {
        quantityRaw: body.quantityRaw ?? before.quantityRaw,
        quantityVerified: body.quantityRaw ? body.quantityRaw : before.quantityVerified,
        supplierProductName: body.supplierProductName ?? before.supplierProductName,
        needsReview: false,
      },
    });

    await writeAuditLog({
      actorId: session.userId,
      action: "ocr_line.update",
      entityType: "OcrLineItem",
      entityId: lineId,
      before,
      after: updated,
    });

    const withProduct = await prisma.ocrLineItem.findUniqueOrThrow({
      where: { id: lineId },
      include: { internalProduct: true },
    });
    return Response.json({
      ok: true,
      line: toClientJson(serializeOcrLineItems([withProduct])[0]),
    });
  } catch (e) {
    return jsonError(e);
  }
}
