import { hasDatabase } from "@/lib/db";
import { prisma } from "@/lib/db";
import { startOfDay } from "date-fns";

const EMPTY_METRICS = {
  cards: {
    incomingToday: 0,
    awaitingOcr: 0,
    awaitingVerification: 0,
    unmatchedLines: 0,
    poAwaitingApproval: 0,
    awaitingReceiving: 0,
    openDiscrepancies: 0,
    invoicesAwaitingVerification: 0,
  },
  statusDistribution: [] as { status: string; _count: { _all: number } }[],
  shipmentsByDay: [] as { submittedAt: Date | null }[],
};

export async function getDashboardMetrics() {
  if (!hasDatabase()) {
    return EMPTY_METRICS;
  }
  const today = startOfDay(new Date());

  const [
    incomingToday,
    awaitingOcr,
    awaitingVerification,
    unmatchedLines,
    poAwaitingApproval,
    awaitingReceiving,
    openDiscrepancies,
    invoicesAwaitingVerification,
  ] = await Promise.all([
    prisma.inboundShipment.count({ where: { submittedAt: { gte: today } } }),
    prisma.suratJalanDocument.count({
      where: { status: { in: ["QUEUED_FOR_OCR", "PROCESSING"] } },
    }),
    prisma.suratJalanDocument.count({
      where: { status: { in: ["NEEDS_REVIEW", "SKU_MAPPING_INCOMPLETE"] } },
    }),
    prisma.ocrLineItem.count({
      where: { mappingStatus: { in: ["PENDING", "NEEDS_REVIEW"] } },
    }),
    prisma.purchaseOrder.count({ where: { status: "SUBMITTED" } }),
    prisma.purchaseOrder.count({ where: { status: "APPROVED" } }),
    prisma.discrepancy.count({
      where: { status: { notIn: ["RESOLVED", "REJECTED", "NONE"] } },
    }),
    prisma.purchaseInvoice.count({ where: { status: "PENDING_VERIFICATION" } }),
  ]);

  const statusDistribution = await prisma.suratJalanDocument.groupBy({
    by: ["status"],
    _count: { _all: true },
  });

  const shipmentsByDay = await prisma.inboundShipment.findMany({
    where: { submittedAt: { gte: new Date(Date.now() - 14 * 86400000) } },
    select: { submittedAt: true },
    orderBy: { submittedAt: "asc" },
  });

  return {
    cards: {
      incomingToday,
      awaitingOcr,
      awaitingVerification,
      unmatchedLines,
      poAwaitingApproval,
      awaitingReceiving,
      openDiscrepancies,
      invoicesAwaitingVerification,
    },
    statusDistribution,
    shipmentsByDay,
  };
}
