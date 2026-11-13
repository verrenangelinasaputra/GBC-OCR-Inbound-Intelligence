import { jsonError, requireApiSession } from "@/lib/api/auth-context";
import { requirePermission } from "@/lib/rbac/permissions";
import { isSheetOnlyMode } from "@/lib/config/app-mode";
import { hasDatabase } from "@/lib/db";
import { contentDispositionAttachment } from "@/lib/http/content-disposition";
import { getOcrSheetDocumentImage } from "@/lib/services/ocr-sheet-image";

function sheetReviewEnabled(): boolean {
  return isSheetOnlyMode() || !hasDatabase();
}

export async function GET(request: Request, context: { params: Promise<{ key: string }> }) {
  if (!sheetReviewEnabled()) {
    return jsonError(new Error("Mode spreadsheet tidak aktif"), 404);
  }
  try {
    const session = await requireApiSession();
    requirePermission(session.roles, "ocr_review", "VIEW", session.allowedModules);
    const { key } = await context.params;
    const url = new URL(request.url);
    const asDownload = url.searchParams.get("download") === "1";
    const { buffer, mimeType, name } = await getOcrSheetDocumentImage(key);
    const displayMime =
      mimeType.startsWith("image/") || mimeType === "application/pdf"
        ? mimeType
        : "image/jpeg";
    const headers: Record<string, string> = {
      "Content-Type": displayMime,
      "Cache-Control": "private, max-age=300",
    };
    if (asDownload) {
      headers["Content-Disposition"] = contentDispositionAttachment(name);
    }
    return new Response(new Uint8Array(buffer), { headers });
  } catch (e) {
    return jsonError(e, 404);
  }
}
