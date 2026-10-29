import { MappingStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireApiPermission, jsonError } from "@/lib/api/auth-context";
import { findProductMatches, requiresHumanReview } from "@/lib/services/product-matching";
import { writeAuditLog } from "@/lib/services/audit";
import { transitionDocumentStatus } from "@/lib/workflow/document-workflow";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireApiPermission("sku_mapping", "EDIT");
    const { id: documentId } = await context.params;
    const body = await request.json();
    const lineId = String(body.lineId);
    const action = String(body.action ?? "suggest");

    const line = await prisma.ocrLineItem.findFirstOrThrow({
      where: { id: lineId, documentId },
    });
    const doc = await prisma.suratJalanDocument.findUniqueOrThrow({ where: { id: documentId } });

    const candidates = await findProductMatches({
      supplierId: doc.supplierId,
      supplierProductName: line.supplierProductName ?? "",
      supplierProductCode: line.supplierProductCode,
    });

    if (action === "suggest") {
      return Response.json({
        candidates,
        requiresReview: requiresHumanReview(candidates),
        message:
          candidates.length === 0
            ? "Tidak ada kandidat — buat mapping manual di SKU Mapping"
            : "Pilih dan approve mapping — skor tinggi tidak auto-approve",
      });
    }

    if (action === "approve" && body.internalProductId) {
      const mapping = await prisma.supplierProductMapping.create({
        data: {
          supplierId: doc.supplierId,
          internalProductId: body.internalProductId,
          supplierProductCode: line.supplierProductCode ?? undefined,
          supplierProductName: line.supplierProductName ?? "Unknown",
          unit: line.unitRaw ?? "PCS",
          status: MappingStatus.VERIFIED,
          verifiedById: session.userId,
          createdById: session.userId,
          lastVerifiedAt: new Date(),
        },
      });
      await prisma.ocrLineItem.update({
        where: { id: lineId },
        data: {
          internalProductId: body.internalProductId,
          mappingId: mapping.id,
          mappingStatus: MappingStatus.VERIFIED,
          needsReview: false,
        },
      });
      await writeAuditLog({
        actorId: session.userId,
        action: "mapping.approve",
        entityType: "SupplierProductMapping",
        entityId: mapping.id,
      });

      const pending = await prisma.ocrLineItem.count({
        where: { documentId, mappingStatus: { not: MappingStatus.VERIFIED } },
      });
      if (pending === 0) {
        await transitionDocumentStatus({
          documentId,
          to: "READY_FOR_PP",
          actorId: session.userId,
          reason: "All lines mapped",
        });
      } else {
        await transitionDocumentStatus({
          documentId,
          to: "SKU_MAPPING_INCOMPLETE",
          actorId: session.userId,
        }).catch(() => undefined);
      }

      return Response.json({ ok: true, mappingId: mapping.id });
    }

    return jsonError(new Error("Invalid action"), 400);
  } catch (e) {
    return jsonError(e);
  }
}
