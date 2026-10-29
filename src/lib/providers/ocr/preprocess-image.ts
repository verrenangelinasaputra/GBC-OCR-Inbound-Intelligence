import sharp from "sharp";

/** Koreksi orientasi EXIF (foto HP sering tampil miring di viewer tapi metadata ada rotasi). */
export async function preprocessImageForOcr(buffer: Buffer, mimeType: string): Promise<Buffer> {
  if (!mimeType.startsWith("image/") || mimeType === "image/gif") {
    return buffer;
  }
  try {
    return await sharp(buffer).rotate().jpeg({ quality: 92 }).toBuffer();
  } catch {
    return buffer;
  }
}
