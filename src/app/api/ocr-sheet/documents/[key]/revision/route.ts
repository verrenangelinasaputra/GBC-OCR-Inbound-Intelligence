import { jsonError, requireApiSession } from "@/lib/api/auth-context";
import { requirePermission } from "@/lib/rbac/permissions";
import { isSheetOnlyMode } from "@/lib/config/app-mode";
import { hasDatabase } from "@/lib/db";
import { getOcrSheetRevisionImage } from "@/lib/services/ocr-sheet-revision-image";

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
    const index = Number(url.searchParams.get("index") ?? "-1");
    const { buffer, mimeType } = await getOcrSheetRevisionImage(key, Number.isFinite(index) ? index : -1);
    const displayMime = mimeType.startsWith("image/") ? mimeType : "image/png";
    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": displayMime,
        "Cache-Control": "private, max-age=120",
      },
    });
  } catch (e) {
    return jsonError(e, 404);
  }
}
