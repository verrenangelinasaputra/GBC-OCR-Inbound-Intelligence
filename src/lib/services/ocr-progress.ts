import { prisma } from "@/lib/db";

export async function updateOcrProgress(
  jobId: string,
  progressPercent: number,
  progressMessage: string
) {
  await prisma.ocrJob.update({
    where: { id: jobId },
    data: {
      progressPercent: Math.min(100, Math.max(0, Math.round(progressPercent))),
      progressMessage,
    },
  });
}
