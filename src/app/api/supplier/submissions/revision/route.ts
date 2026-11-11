import { getSession } from "@/lib/auth/session";
import { getOcrSheetRevisionImage } from "@/lib/services/ocr-sheet-revision-image";
import { assertSupplierCanAccessDocKey } from "@/lib/services/supplier-submission-access";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session?.username) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
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
    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": displayMime,
        "Cache-Control": "private, max-age=120",
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Gagal memuat revisi";
    const code = msg === "FORBIDDEN" ? 403 : 404;
    return Response.json({ error: msg }, { status: code });
  }
}
