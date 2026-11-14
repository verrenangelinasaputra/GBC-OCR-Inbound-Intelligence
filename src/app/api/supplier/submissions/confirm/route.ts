import { getSession } from "@/lib/auth/session";
import { normalizeOcrReviewStatus } from "@/lib/ocr-review/workflow-status";
import { assertSupplierCanAccessDocKey } from "@/lib/services/supplier-submission-access";
import { getOcrSheetDocumentDetail } from "@/lib/services/ocr-sheet-detail";
import { setOcrDocumentReviewStatus } from "@/lib/services/ocr-sheet-review";
import { supplierCanConfirmReceipt } from "@/lib/services/ocr-sheet-submissions";
import { enforceSupplierMappingIfUser } from "@/lib/services/supplier-mapping-gate";
import { jsonError } from "@/lib/api/auth-context";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session?.username) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    await enforceSupplierMappingIfUser(session);
  } catch (e) {
    return jsonError(e, 403);
  }

  try {
    const body = await request.json();
    const docKey = String(body.docKey ?? "").trim();
    if (!docKey) return Response.json({ error: "docKey wajib" }, { status: 400 });

    await assertSupplierCanAccessDocKey({
      username: session.username,
      roles: session.roles,
      docKey,
    });

    const doc = await getOcrSheetDocumentDetail(docKey);
    const status = normalizeOcrReviewStatus(doc.statusReview);
    if (!supplierCanConfirmReceipt(status)) {
      return Response.json(
        { error: "Pengiriman ini belum bisa dikonfirmasi (status gudang bukan menunggu konfirmasi supplier)." },
        { status: 400 }
      );
    }

    await setOcrDocumentReviewStatus({ docKey, status: "SELESAI" });
    return Response.json({ ok: true, status: "SELESAI" });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Gagal konfirmasi";
    const code = msg === "FORBIDDEN" ? 403 : 500;
    return Response.json({ error: msg }, { status: code });
  }
}
