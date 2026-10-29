import { prisma } from "../src/lib/db";
import { OcrJobStatus } from "@prisma/client";

async function main() {
  const stale = await prisma.ocrJob.updateMany({
    where: {
      status: { in: [OcrJobStatus.PENDING, OcrJobStatus.PROCESSING] },
      createdAt: { lt: new Date(Date.now() - 5 * 60 * 1000) },
    },
    data: {
      status: OcrJobStatus.FAILED,
      errorMessage: "Stale job cleaned up",
      completedAt: new Date(),
    },
  });
  console.log("Cleaned stale OCR jobs:", stale.count);
}

main().finally(() => prisma.$disconnect());
