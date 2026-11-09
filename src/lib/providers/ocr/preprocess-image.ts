import sharp from "sharp";

function maxEdgePx(): number {
  const raw = Number(process.env.OCR_MAX_IMAGE_PX);
  if (Number.isFinite(raw) && raw >= 800 && raw <= 4096) return raw;
  return 1400;
}

/** Resize + JPEG — foto WA sering 3000px+; lebih kecil = Gemini lebih cepat, OCR SJ tetap terbaca. */
export async function preprocessImageForOcr(buffer: Buffer, mimeType: string): Promise<Buffer> {
  if (!mimeType.startsWith("image/") || mimeType === "image/gif") {
    return buffer;
  }
  try {
    const maxEdge = maxEdgePx();
    let pipeline = sharp(buffer).rotate();
    const meta = await pipeline.metadata();
    const w = meta.width ?? 0;
    const h = meta.height ?? 0;

    if (w > maxEdge || h > maxEdge) {
      pipeline = pipeline.resize({
        width: w >= h ? maxEdge : undefined,
        height: h > w ? maxEdge : undefined,
        fit: "inside",
        withoutEnlargement: true,
      });
    }

    return await pipeline
      .normalize()
      .sharpen({ sigma: 0.6, m1: 0.5, m2: 0.35 })
      .jpeg({ quality: 80, mozjpeg: true })
      .toBuffer();
  } catch {
    return buffer;
  }
}
