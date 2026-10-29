import { Prisma } from "@prisma/client";
import { DiscrepancyStatus, GoodsReceiptStatus, SuratJalanStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { generateReference } from "@/lib/services/references";
import { transitionDocumentStatus } from "@/lib/workflow/document-workflow";
import { writeAuditLog } from "@/lib/services/audit";

export type ReceiptLineInput = {
  purchaseOrderItemId: string;
  qtyReceived: number;
  explanation?: string;
};

export async function createGoodsReceipt(params: {
  purchaseOrderId: string;
  receivedById: string;
  lines: ReceiptLineInput[];
  notes?: string;
}) {
  const po = await prisma.purchaseOrder.findUniqueOrThrow({
    where: { id: params.purchaseOrderId },
    include: {
      items: { include: { ocrLineItem: true } },
      document: true,
    },
  });
  if (po.status !== "APPROVED") {
    throw new Error("PP harus approved sebelum penerimaan barang");
  }

  const grNumber = generateReference("GR");
  const gr = await prisma.goodsReceipt.create({
    data: {
      grNumber,
      purchaseOrderId: po.id,
      receivedById: params.receivedById,
      status: GoodsReceiptStatus.SUBMITTED,
      notes: params.notes,
    },
  });

  let hasDiscrepancy = false;
  for (const line of params.lines) {
    const poi = po.items.find((i) => i.id === line.purchaseOrderItemId);
    if (!poi) continue;
    const qtyPo = new Prisma.Decimal(poi.quantity.toString());
    const qtyReceived = new Prisma.Decimal(line.qtyReceived);
    const diff = qtyReceived.minus(qtyPo);
    const qtySj = poi.ocrLineItem?.quantityVerified
      ? new Prisma.Decimal(poi.ocrLineItem.quantityVerified.toString())
      : poi.ocrLineItem?.quantityRaw
        ? new Prisma.Decimal(poi.ocrLineItem.quantityRaw)
        : null;

    await prisma.goodsReceiptItem.create({
      data: {
        goodsReceiptId: gr.id,
        purchaseOrderItemId: poi.id,
        internalProductId: poi.internalProductId,
        ocrLineItemId: poi.ocrLineItemId ?? undefined,
        qtySuratJalan: qtySj ?? undefined,
        qtyPurchaseOrder: qtyPo,
        qtyReceived,
        differenceQty: diff,
        differenceStatus: diff.isZero() ? "match" : "variance",
        explanation: line.explanation,
      },
    });

    if (!diff.isZero()) {
      hasDiscrepancy = true;
      await prisma.discrepancy.create({
        data: {
          discrepancyNumber: generateReference("DIS"),
          purchaseOrderId: po.id,
          goodsReceiptId: gr.id,
          ocrLineItemId: poi.ocrLineItemId ?? undefined,
          internalProductId: poi.internalProductId,
          expectedQty: qtyPo,
          actualQty: qtyReceived,
          differenceQty: diff,
          reasonCategory: diff.gt(0) ? "excess" : "shortage",
          status: DiscrepancyStatus.PENDING_REVIEW,
          reportedById: params.receivedById,
        },
      });
    }
  }

  const priorReceipts = await prisma.goodsReceipt.count({
    where: { purchaseOrderId: po.id, id: { not: gr.id } },
  });
  const docStatus = hasDiscrepancy
    ? SuratJalanStatus.DISCREPANCY_OPEN
    : priorReceipts > 0
      ? SuratJalanStatus.PARTIALLY_RECEIVED
      : SuratJalanStatus.FULLY_RECEIVED;

  await transitionDocumentStatus({
    documentId: po.documentId,
    to: docStatus,
    actorId: params.receivedById,
  }).catch(() => undefined);

  if (!hasDiscrepancy) {
    await transitionDocumentStatus({
      documentId: po.documentId,
      to: SuratJalanStatus.READY_FOR_PRICE_VERIFICATION,
      actorId: params.receivedById,
    }).catch(() => undefined);
  }

  await writeAuditLog({
    actorId: params.receivedById,
    action: "goods_receipt.submit",
    entityType: "GoodsReceipt",
    entityId: gr.id,
    after: { grNumber, hasDiscrepancy },
  });

  return gr;
}
