import { jsonError, requireApiSession } from "@/lib/api/auth-context";
import { requirePermission } from "@/lib/rbac/permissions";
import { isSheetOnlyMode } from "@/lib/config/app-mode";
import { hasDatabase } from "@/lib/db";
import {
  getOcrSheetDocumentDetail,
  saveOcrSheetDocumentEdits,
  type OcrSheetHeaderPatch,
  type OcrSheetLinePatch,
} from "@/lib/services/ocr-sheet-detail";
import { markOcrDocumentOpened } from "@/lib/services/ocr-sheet-review";

function sheetReviewEnabled(): boolean {
  return isSheetOnlyMode() || !hasDatabase();
}

async function requireOcrSheetEdit() {
  const session = await requireApiSession();
  requirePermission(session.roles, "ocr_review", "EDIT");
  return session;
}

async function requireOcrSheetView() {
  const session = await requireApiSession();
  requirePermission(session.roles, "ocr_review", "VIEW");
  return session;
}

export async function GET(_request: Request, context: { params: Promise<{ key: string }> }) {
  if (!sheetReviewEnabled()) {
    return jsonError(new Error("Mode spreadsheet tidak aktif"), 404);
  }
  try {
    await requireOcrSheetView();
    const { key } = await context.params;
    const doc = await getOcrSheetDocumentDetail(key);
    await markOcrDocumentOpened(key).catch(() => null);
    const refreshed = await getOcrSheetDocumentDetail(key);
    return Response.json({ doc: refreshed });
  } catch (e) {
    return jsonError(e);
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ key: string }> }) {
  if (!sheetReviewEnabled()) {
    return jsonError(new Error("Mode spreadsheet tidak aktif"), 404);
  }
  try {
    await requireOcrSheetEdit();
    const { key } = await context.params;
    const body = await request.json();
    const header = body.header as OcrSheetHeaderPatch | undefined;
    const lines = Array.isArray(body.lines) ? (body.lines as OcrSheetLinePatch[]) : undefined;
    const doc = await saveOcrSheetDocumentEdits({ docKey: key, header, lines });
    return Response.json({ ok: true, doc });
  } catch (e) {
    return jsonError(e);
  }
}
