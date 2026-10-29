import { MappingStatus, PurchaseOrderStatus, SuratJalanStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { generateReference } from "@/lib/services/references";
import { transitionDocumentStatus } from "@/lib/workflow/document-workflow";
import { writeAuditLog } from "@/lib/services/audit";

function canTransitionToReady(status: SuratJalanStatus): boolean {
  return [
    "OCR_COMPLETED",
    "NEEDS_REVIEW",
    "SKU_MAPPING_INCOMPLETE",
  ].includes(status);
}

export async function createPurchaseOrderFromDocument(documentId: string, actorId: string) {
  const existing = await prisma.purchaseOrder.findFirst({ where: { documentId } });
  if (existing) {
    throw new Error("PP sudah ada untuk dokumen ini");
  }

  const doc = await prisma.suratJalanDocument.findUniqueOrThrow({
    where: { id: documentId },
    include: { lineItems: { include: { internalProduct: true } } },
  });

  const unmapped = doc.lineItems.filter(
    (l) => !l.internalProductId || l.mappingStatus !== MappingStatus.VERIFIED
  );
  if (unmapped.length > 0) {
    throw new Error("SKU mapping belum lengkap / belum diverifikasi");
  }

  const ppNumber = generateReference("PP");
  const po = await prisma.purchaseOrder.create({
    data: {
      ppNumber,
      supplierId: doc.supplierId,
      documentId: doc.id,
      status: PurchaseOrderStatus.DRAFT,
      createdById: actorId,
      items: {
        create: doc.lineItems.map((line) => ({
          ocrLineItemId: line.id,
          internalProductId: line.internalProductId!,
          supplierDescription: line.supplierProductName ?? undefined,
          quantity: line.quantityVerified ?? line.quantityRaw ?? "0",
          unit: line.unitRaw ?? "PCS",
        })),
      },
    },
    include: { items: true },
  });

  const fresh = await prisma.suratJalanDocument.findUniqueOrThrow({ where: { id: documentId } });
  if (fresh.status !== "READY_FOR_PP" && fresh.status !== "PP_PENDING_APPROVAL") {
    if (canTransitionToReady(fresh.status)) {
      await transitionDocumentStatus({
        documentId,
        to: "READY_FOR_PP",
        actorId,
        reason: "Ready for PP",
      }).catch(() => undefined);
    }
  }
  await transitionDocumentStatus({
    documentId,
    to: "PP_PENDING_APPROVAL",
    actorId,
    reason: `PP draft ${ppNumber} created`,
  });

  await writeAuditLog({
    actorId,
    action: "purchase_order.create",
    entityType: "PurchaseOrder",
    entityId: po.id,
    after: { ppNumber },
  });

  return po;
}

export async function approvePurchaseOrder(poId: string, actorId: string) {
  const po = await prisma.purchaseOrder.update({
    where: { id: poId },
    data: {
      status: PurchaseOrderStatus.APPROVED,
      approvedById: actorId,
      approvedAt: new Date(),
    },
  });
  await transitionDocumentStatus({
    documentId: po.documentId,
    to: "PP_APPROVED",
    actorId,
  });
  await writeAuditLog({
    actorId,
    action: "purchase_order.approve",
    entityType: "PurchaseOrder",
    entityId: poId,
  });
  return po;
}
