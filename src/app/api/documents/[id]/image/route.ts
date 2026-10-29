import { prisma } from "@/lib/db";
import { requireApiSession, jsonError } from "@/lib/api/auth-context";
import { getStorageProvider } from "@/lib/providers/storage/local-storage";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireApiSession();
    const { id } = await context.params;
    const page = Number(new URL(request.url).searchParams.get("page") ?? "1");

    const doc = await prisma.suratJalanDocument.findUniqueOrThrow({
      where: { id },
      include: { images: true },
    });

    if (
      session.roles.includes("SUPPLIER_USER") &&
      !session.roles.includes("SUPER_ADMIN") &&
      doc.supplierId !== session.supplierId
    ) {
      return jsonError(new Error("FORBIDDEN"), 403);
    }

    const image = doc.images.find((i) => i.pageNumber === page) ?? doc.images[0];
    if (!image) return jsonError(new Error("Image not found"), 404);

    const buffer = await getStorageProvider().readFile(image.storageKey);
    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": image.mimeType,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (e) {
    return jsonError(e, 404);
  }
}
