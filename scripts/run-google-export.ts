import { loadEnvFile } from "./load-env";
import { runGoogleExport } from "../src/lib/services/google-export-service";
import { prisma } from "../src/lib/db";

loadEnvFile();

const docId = process.argv[2];
if (!docId) {
  console.log("Usage: npx tsx scripts/run-google-export.ts <documentId> [--force]");
  process.exit(1);
}

async function main() {
  const force = process.argv.includes("--force");
  if (force) {
    await prisma.suratJalanDocument.update({
      where: { id: docId },
      data: { googleSheetExportedAt: null },
    });
  }
  await runGoogleExport(docId, { force: true });
  const doc = await prisma.suratJalanDocument.findUniqueOrThrow({ where: { id: docId } });
  console.log({
    googleSheetExportedAt: doc.googleSheetExportedAt,
    googleDriveFileUrl: doc.googleDriveFileUrl,
    googleExportLastError: doc.googleExportLastError,
  });
}

main().finally(() => prisma.$disconnect());
