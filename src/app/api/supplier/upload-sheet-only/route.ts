import { jsonError } from "@/lib/api/auth-context";
import { getSession } from "@/lib/auth/session";
import { isSheetOnlyMode } from "@/lib/config/app-mode";
import { processSheetOnlyUpload } from "@/lib/services/sheet-only-upload";

const ALLOWED = new Set(["image/jpeg", "image/jpg", "image/png", "application/pdf"]);
const MAX_BYTES = 15 * 1024 * 1024;

export async function POST(request: Request) {
  if (!isSheetOnlyMode()) {
    return jsonError(new Error("SHEET_ONLY_MODE bukan true — endpoint nonaktif"), 404);
  }

  const session = await getSession();
  if (!session?.roles.includes("SUPPLIER_USER") && !session?.roles.includes("SUPER_ADMIN")) {
    return jsonError(new Error("UNAUTHORIZED"), 401);
  }

  try {
    const form = await request.formData();
    const notes = String(form.get("notes") ?? "");
    const vehicleInfo = String(form.get("vehicleInfo") ?? "");
    const files = form.getAll("files").filter((f): f is File => f instanceof File);
    if (files.length === 0) {
      return jsonError(new Error("Minimal 1 file Surat Jalan"), 400);
    }
    if (files.length > 1) {
      return jsonError(
        new Error("Mode Sheet-only: upload 1 file per submit (multi-page: gabung PDF dulu)."),
        400
      );
    }

    const file = files[0];
    if (!ALLOWED.has(file.type)) {
      return jsonError(new Error(`Format tidak diizinkan: ${file.type}`), 400);
    }
    const buffer = Buffer.from(await file.arrayBuffer());
    if (buffer.length > MAX_BYTES) {
      return jsonError(new Error("File terlalu besar (max 15MB)"), 400);
    }

    const result = await processSheetOnlyUpload({
      file: { buffer, mimeType: file.type, name: file.name },
      notes: notes || undefined,
      vehicleInfo: vehicleInfo || undefined,
    });

    return Response.json({
      ok: true,
      mode: "sheet-only",
      submissionRef: result.submissionRef,
      suratJalanNumber: result.suratJalanNumber,
      sheetRowCount: result.sheetRowCount,
      driveFileUrl: result.driveFileUrl,
      driveWarning: result.driveWarning,
      ocrWarnings: result.ocrWarnings,
      message: "Data tersimpan di Google Spreadsheet" + (result.driveFileUrl ? " + Drive" : ""),
    });
  } catch (e) {
    return jsonError(e instanceof Error ? e : new Error("Upload gagal"));
  }
}
