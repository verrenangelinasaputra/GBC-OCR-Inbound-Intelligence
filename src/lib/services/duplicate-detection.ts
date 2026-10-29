import { prisma } from "@/lib/db";

export async function findDuplicateDocuments(params: {
  supplierId: string;
  suratJalanNumber?: string | null;
  fileFingerprint?: string | null;
}) {
  const or: Array<Record<string, unknown>> = [];
  if (params.fileFingerprint) {
    or.push({ fileFingerprint: params.fileFingerprint });
  }
  if (params.suratJalanNumber) {
    or.push({
      supplierId: params.supplierId,
      suratJalanNumber: params.suratJalanNumber,
    });
  }
  if (or.length === 0) return [];
  return prisma.suratJalanDocument.findMany({
    where: { OR: or },
    select: { id: true, submissionRef: true, status: true, createdAt: true },
    take: 5,
  });
}
