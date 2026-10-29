import { InvoiceStatus, PayableStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { generateReference } from "@/lib/services/references";
import { suggestPurchasePrice } from "@/lib/services/price-selection";
import { transitionDocumentStatus } from "@/lib/workflow/document-workflow";
import { writeAuditLog } from "@/lib/services/audit";
import { Prisma } from "@prisma/client";

export async function prepareInvoiceFromPurchaseOrder(purchaseOrderId: string, actorId: string) {
  const po = await prisma.purchaseOrder.findUniqueOrThrow({
    where: { id: purchaseOrderId },
    include: {
      items: { include: { ocrLineItem: true, internalProduct: true } },
      receipts: { include: { items: true } },
      document: true,
    },
  });

  if (po.receipts.length === 0) {
    throw new Error("Belum ada goods receipt — invoice belum bisa disiapkan");
  }

  const existing = await prisma.purchaseInvoice.findFirst({ where: { purchaseOrderId } });
  if (existing) return existing;

  const invoiceNumber = generateReference("INV");
  const invoice = await prisma.purchaseInvoice.create({
    data: {
      invoiceNumber,
      supplierId: po.supplierId,
      purchaseOrderId: po.id,
      status: InvoiceStatus.PENDING_VERIFICATION,
    },
  });

  let subtotal = new Prisma.Decimal(0);
  for (const item of po.items) {
    const received = po.receipts.flatMap((r) => r.items).find((ri) => ri.purchaseOrderItemId === item.id);
    const qty = received?.qtyReceived ?? item.quantity;
    const sjPrice = item.ocrLineItem?.unitPriceVerified ?? item.ocrLineItem?.unitPriceRaw;
    const priceSuggestion = await suggestPurchasePrice({
      internalProductId: item.internalProductId,
      supplierId: po.supplierId,
      unit: item.unit,
    });

    const priceFromSuratJalan = sjPrice ? new Prisma.Decimal(sjPrice.toString()) : undefined;
    const priceFromMaster = priceSuggestion.priceFromMaster;

    const lineTotal = (priceFromMaster ?? priceFromSuratJalan ?? new Prisma.Decimal(0)).mul(
      new Prisma.Decimal(qty.toString())
    );
    subtotal = subtotal.add(lineTotal);

    await prisma.purchaseInvoiceItem.create({
      data: {
        invoiceId: invoice.id,
        internalProductId: item.internalProductId,
        ocrLineItemId: item.ocrLineItemId ?? undefined,
        quantity: qty,
        unit: item.unit,
        priceFromSuratJalan,
        priceFromMaster,
        priceFinal: priceFromMaster ?? priceFromSuratJalan,
        lineTotal,
      },
    });
  }

  await prisma.purchaseInvoice.update({
    where: { id: invoice.id },
    data: { subtotal, totalAmount: subtotal, status: InvoiceStatus.PENDING_VERIFICATION },
  });

  await transitionDocumentStatus({
    documentId: po.documentId,
    to: "INVOICE_PREPARED",
    actorId,
  }).catch(() => undefined);

  await writeAuditLog({
    actorId,
    action: "invoice.prepare",
    entityType: "PurchaseInvoice",
    entityId: invoice.id,
  });

  return invoice;
}

export async function verifyInvoiceAndCreatePayable(params: {
  invoiceId: string;
  actorId: string;
  paymentTermCode?: string;
}) {
  const invoice = await prisma.purchaseInvoice.findUniqueOrThrow({
    where: { id: params.invoiceId },
    include: { purchaseOrder: true },
  });

  const verified = await prisma.purchaseInvoice.update({
    where: { id: invoice.id },
    data: {
      status: InvoiceStatus.VERIFIED,
      verifiedById: params.actorId,
      verifiedAt: new Date(),
    },
  });

  let paymentTermId: string | undefined;
  let dueDate: Date | undefined;
  if (params.paymentTermCode) {
    const term = await prisma.paymentTerm.findUnique({ where: { code: params.paymentTermCode } });
    if (term) {
      paymentTermId = term.id;
      dueDate = new Date(Date.now() + term.daysUntilDue * 86400000);
    }
  }

  const ap = await prisma.accountsPayableRecord.create({
    data: {
      apNumber: generateReference("AP"),
      supplierId: invoice.supplierId,
      invoiceId: invoice.id,
      invoiceReference: invoice.invoiceNumber,
      amount: invoice.totalAmount ?? 0,
      outstanding: invoice.totalAmount ?? 0,
      paymentTermId,
      invoiceDate: new Date(),
      dueDate,
      paymentStatus: PayableStatus.OPEN,
    },
  });

  await transitionDocumentStatus({
    documentId: invoice.purchaseOrder.documentId,
    to: "PRICE_VERIFIED",
    actorId: params.actorId,
  }).catch(() => undefined);
  await transitionDocumentStatus({
    documentId: invoice.purchaseOrder.documentId,
    to: "COMPLETED",
    actorId: params.actorId,
  }).catch(() => undefined);

  await writeAuditLog({
    actorId: params.actorId,
    action: "invoice.verify_and_ap",
    entityType: "AccountsPayableRecord",
    entityId: ap.id,
  });

  return { invoice: verified, payable: ap };
}
