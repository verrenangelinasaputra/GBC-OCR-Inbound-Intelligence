import { loadEnvFile } from "./load-env";
import { prisma } from "../src/lib/db";
import { isGoogleExportConfigured, getGoogleExportConfigOptional } from "../src/lib/providers/google-workspace";

loadEnvFile();

async function main() {
  console.log("GOOGLE_EXPORT_ENABLED:", process.env.GOOGLE_EXPORT_ENABLED);
  console.log("Configured:", isGoogleExportConfigured());
  console.log("Config:", getGoogleExportConfigOptional()
    ? {
        folder: process.env.GOOGLE_DRIVE_FOLDER_ID,
        sheet: process.env.GOOGLE_SHEET_ID,
        tab: process.env.GOOGLE_SHEET_TAB,
        sa: getGoogleExportConfigOptional()?.credentials.client_email,
      }
    : null);

  const docs = await prisma.suratJalanDocument.findMany({
    orderBy: { updatedAt: "desc" },
    take: 5,
    select: {
      id: true,
      submissionRef: true,
      suratJalanNumber: true,
      googleSheetExportedAt: true,
      googleDriveFileUrl: true,
      googleExportLastError: true,
      ocrJobs: { orderBy: { createdAt: "desc" }, take: 1, select: { status: true, completedAt: true } },
    },
  });
  console.log("\nRecent documents:");
  for (const d of docs) {
    console.log(JSON.stringify(d, null, 2));
  }

  const audits = await prisma.auditLog.findMany({
    where: { action: { startsWith: "google.export" } },
    orderBy: { createdAt: "desc" },
    take: 5,
  });
  console.log("\nGoogle export audit logs:", audits.length);
  for (const a of audits) {
    console.log(a.action, a.entityId, a.after);
  }
}

main().finally(() => prisma.$disconnect());
