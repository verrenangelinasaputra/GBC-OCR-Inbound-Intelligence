import { requireApiPermission, jsonError } from "@/lib/api/auth-context";
import { runGoogleExport } from "@/lib/services/google-export-service";
import { prisma } from "@/lib/db";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await requireApiPermission("ocr_review", "EDIT");
    const { id } = await context.params;
    const body = await request.json().catch(() => ({}));
    const force = body?.force === true;

    if (force) {
      await prisma.suratJalanDocument.update({
        where: { id },
        data: { googleSheetExportedAt: null },
      });
    }

    await runGoogleExport(id, { force: true });

    const doc = await prisma.suratJalanDocument.findUniqueOrThrow({
      where: { id },
      select: {
        googleSheetExportedAt: true,
        googleDriveFileUrl: true,
        googleExportLastError: true,
      },
    });

    return Response.json({
      ok: true,
      exportedAt: doc.googleSheetExportedAt,
      driveUrl: doc.googleDriveFileUrl,
      warning: doc.googleExportLastError,
    });
  } catch (e) {
    return jsonError(e);
  }
}
