import { prisma } from "../src/lib/db";

async function main() {
  const doc = await prisma.suratJalanDocument.findFirst({
    orderBy: { createdAt: "desc" },
    include: { ocrJobs: { orderBy: { createdAt: "desc" } }, lineItems: true },
  });
  if (!doc) {
    console.log("No documents");
    return;
  }
  console.log(
    JSON.stringify(
      {
        id: doc.id,
        status: doc.status,
        submissionRef: doc.submissionRef,
        suratJalanNumber: doc.suratJalanNumber,
        lineCount: doc.lineItems.length,
        jobs: doc.ocrJobs.map((j) => ({
          id: j.id,
          status: j.status,
          providerKey: j.providerKey,
          errorMessage: j.errorMessage,
          warnings: j.warnings,
          completedAt: j.completedAt,
        })),
      },
      null,
      2
    )
  );
}

main()
  .finally(() => prisma.$disconnect());
