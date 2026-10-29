import { SuratJalanStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { writeAuditLog } from "@/lib/services/audit";

const TRANSITIONS: Partial<Record<SuratJalanStatus, SuratJalanStatus[]>> = {
  UPLOADED: ["QUEUED_FOR_OCR", "REJECTED", "CANCELLED"],
  QUEUED_FOR_OCR: ["PROCESSING", "CANCELLED"],
  PROCESSING: ["OCR_COMPLETED", "NEEDS_REVIEW", "CANCELLED"],
  OCR_COMPLETED: ["NEEDS_REVIEW", "SKU_MAPPING_INCOMPLETE", "READY_FOR_PP"],
  NEEDS_REVIEW: ["SKU_MAPPING_INCOMPLETE", "READY_FOR_PP", "REJECTED", "PROCESSING"],
  SKU_MAPPING_INCOMPLETE: ["READY_FOR_PP", "NEEDS_REVIEW"],
  READY_FOR_PP: ["PP_PENDING_APPROVAL"],
  PP_PENDING_APPROVAL: ["PP_APPROVED", "NEEDS_REVIEW", "REJECTED", "PROCESSING"],
  PP_APPROVED: [
    "PARTIALLY_RECEIVED",
    "FULLY_RECEIVED",
    "DISCREPANCY_OPEN",
    "PROCESSING",
    "NEEDS_REVIEW",
  ],
  PARTIALLY_RECEIVED: ["FULLY_RECEIVED", "DISCREPANCY_OPEN", "READY_FOR_PRICE_VERIFICATION"],
  FULLY_RECEIVED: ["READY_FOR_PRICE_VERIFICATION", "DISCREPANCY_OPEN"],
  DISCREPANCY_OPEN: ["PARTIALLY_RECEIVED", "FULLY_RECEIVED", "READY_FOR_PRICE_VERIFICATION"],
  READY_FOR_PRICE_VERIFICATION: ["PRICE_VERIFIED"],
  PRICE_VERIFIED: ["INVOICE_PREPARED"],
  INVOICE_PREPARED: ["COMPLETED"],
};

export function canTransition(from: SuratJalanStatus, to: SuratJalanStatus): boolean {
  const allowed = TRANSITIONS[from];
  if (!allowed) return false;
  return allowed.includes(to);
}

export async function transitionDocumentStatus(params: {
  documentId: string;
  to: SuratJalanStatus;
  actorId?: string;
  reason?: string;
}) {
  const doc = await prisma.suratJalanDocument.findUniqueOrThrow({
    where: { id: params.documentId },
  });
  if (doc.status === params.to) {
    return doc;
  }
  if (!canTransition(doc.status, params.to)) {
    throw new Error(`Invalid transition ${doc.status} -> ${params.to}`);
  }
  const updated = await prisma.suratJalanDocument.update({
    where: { id: params.documentId },
    data: { status: params.to },
  });
  await prisma.documentStatusHistory.create({
    data: {
      documentId: params.documentId,
      previousStatus: doc.status,
      newStatus: params.to,
      reason: params.reason,
      changedById: params.actorId,
    },
  });
  await writeAuditLog({
    actorId: params.actorId,
    action: "document.status_change",
    entityType: "SuratJalanDocument",
    entityId: params.documentId,
    before: { status: doc.status },
    after: { status: params.to, reason: params.reason },
  });
  return updated;
}
