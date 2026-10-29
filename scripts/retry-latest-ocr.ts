import { readFileSync } from "fs";
import { resolve } from "path";
import { enqueueOcrJob } from "../src/lib/services/ocr-pipeline";
import { prisma } from "../src/lib/db";

for (const line of readFileSync(resolve(process.cwd(), ".env"), "utf8").split("\n")) {
  const m = line.match(/^([A-Z_]+)="(.*)"$/);
  if (m) process.env[m[1]] = m[2];
}

async function main() {
  const doc = await prisma.suratJalanDocument.findFirst({
    orderBy: { createdAt: "desc" },
    include: { lineItems: true, ocrJobs: { orderBy: { createdAt: "desc" }, take: 1 } },
  });
  if (!doc) throw new Error("No document");

  console.log("Retry OCR for", doc.submissionRef, doc.id);
  await enqueueOcrJob(doc.id, undefined, { waitForCompletion: true });
  const updated = await prisma.suratJalanDocument.findUniqueOrThrow({
    where: { id: doc.id },
    include: {
      lineItems: true,
      ocrJobs: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });
  console.log("Status:", updated.status);
  console.log("Lines:", updated.lineItems.length);
  console.log("Latest job:", updated.ocrJobs[0]?.status, updated.ocrJobs[0]?.providerKey);
  if (updated.ocrJobs[0]?.errorMessage) {
    console.log("Error:", updated.ocrJobs[0].errorMessage.slice(0, 200));
  }
  if (updated.lineItems[0]) {
    console.log("Sample:", updated.lineItems[0].supplierProductName, updated.lineItems[0].quantityRaw);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
