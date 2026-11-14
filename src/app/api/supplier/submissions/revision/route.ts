import { getSession } from "@/lib/auth/session";
import { getOcrSheetRevisionImage } from "@/lib/services/ocr-sheet-revision-image";
import { assertSupplierCanAccessDocKey } from "@/lib/services/supplier-submission-access";
import { enforceSupplierMappingIfUser } from "@/lib/services/supplier-mapping-gate";
import { jsonError } from "@/lib/api/auth-context";
import { contentDispositionAttachment } from "@/lib/http/content-disposition";

export async function GET(request: Request) {
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
    const url = new URL(request.url);
    const docKey = url.searchParams.get("docKey")?.trim() ?? "";
    const index = Number(url.searchParams.get("index") ?? "0");
    if (!docKey) return Response.json({ error: "docKey wajib" }, { status: 400 });

    await assertSupplierCanAccessDocKey({
      username: session.username,
      roles: session.roles,
      docKey,
    });

    const { buffer, mimeType } = await getOcrSheetRevisionImage(
      docKey,
      Number.isFinite(index) ? index : 0
    );
    const displayMime = mimeType.startsWith("image/") ? mimeType : "image/png";
    const ext = displayMime.includes("jpeg") || displayMime.includes("jpg") ? ".jpg" : ".png";
    const wantDownload = url.searchParams.get("download") === "1";
    const rawName = url.searchParams.get("fileName")?.trim();
    const safeName = (rawName?.replace(/[^\w\s.\-()]/g, "_").slice(0, 120) || `revisi-${index + 1}`).replace(
      /\.[a-z0-9]+$/i,
      ""
    );
    const fileName = `${safeName}${ext}`;
    const headers: Record<string, string> = {
      "Content-Type": displayMime,
      "Cache-Control": "private, max-age=120",
    };
    if (wantDownload) {
      headers["Content-Disposition"] = contentDispositionAttachment(fileName);
    }
    return new Response(new Uint8Array(buffer), {
      headers,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Gagal memuat revisi";
    const code = msg === "FORBIDDEN" ? 403 : 404;
    return Response.json({ error: msg }, { status: code });
  }
}
