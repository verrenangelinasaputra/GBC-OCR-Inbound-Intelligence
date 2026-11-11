import { readFileSync } from "fs";
import path from "path";
import * as opentype from "opentype.js";
import sharp from "sharp";
import type { OcrSheetDocumentDetail } from "@/lib/services/ocr-sheet-detail";

const GREEN = "#007a3d";

let revisionFont: opentype.Font | null = null;

function getRevisionFont(): opentype.Font {
  if (!revisionFont) {
    const fontPath = path.join(process.cwd(), "node_modules/dejavu-fonts-ttf/ttf/DejaVuSans.ttf");
    const buf = readFileSync(fontPath);
    revisionFont = opentype.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
  }
  if (!revisionFont) throw new Error("Font revisi DejaVu tidak bisa dimuat");
  return revisionFont;
}

function glyphAdvance(glyph: opentype.Glyph, scale: number): number {
  return (glyph.advanceWidth ?? 0) * scale;
}

function escPath(d: string): string {
  return d.replace(/"/g, "'");
}

type TextOpts = { anchor?: "start" | "middle" };

/** Glyph-by-glyph — hindari GSUB/Bidi opentype.js yang gagal di beberapa font. */
function textWidth(text: string, fontSize: number): number {
  const font = getRevisionFont();
  const scale = fontSize / font.unitsPerEm;
  let w = 0;
  for (const ch of text || " ") {
    w += glyphAdvance(font.charToGlyph(ch), scale);
  }
  return w;
}

function svgText(x: number, y: number, text: string, fontSize: number, opts: TextOpts = {}): string {
  const font = getRevisionFont();
  const safe = text || " ";
  const scale = fontSize / font.unitsPerEm;
  let cursorX = x;
  if (opts.anchor === "middle") {
    cursorX = x - textWidth(safe, fontSize) / 2;
  }
  const parts: string[] = [];
  for (const ch of safe) {
    const glyph = font.charToGlyph(ch);
    parts.push(glyph.getPath(cursorX, y, fontSize).toPathData(2));
    cursorX += glyphAdvance(glyph, scale);
  }
  return `<path fill="${GREEN}" d="${escPath(parts.join(" "))}"/>`;
}

function svgTextMuted(x: number, y: number, text: string, fontSize: number): string {
  const font = getRevisionFont();
  const scale = fontSize / font.unitsPerEm;
  let cursorX = x;
  const parts: string[] = [];
  for (const ch of text || " ") {
    const glyph = font.charToGlyph(ch);
    parts.push(glyph.getPath(cursorX, y, fontSize).toPathData(2));
    cursorX += glyphAdvance(glyph, scale);
  }
  return `<path fill="#666666" d="${escPath(parts.join(" "))}"/>`;
}

/** Gambar revisi SJ — layout hijau mirip contoh fisik; teks sebagai path (tanpa font sistem). */
export function buildSuratJalanRevisionSvg(doc: OcrSheetDocumentDetail): string {
  const w = 900;
  const rowH = 36;
  const headerBlock = 220;
  const tableRows = Math.max(doc.lines.length, 1);
  const h = headerBlock + 80 + tableRows * rowH + 140;

  const itemRows = doc.lines
    .map((line, i) => {
      const rowY = headerBlock + 55 + i * rowH;
      return [
        svgText(40, rowY, String(i + 1), 13),
        svgText(90, rowY, line.banyaknya, 12),
        svgText(200, rowY, line.isi, 12),
        svgText(320, rowY, line.namaBarang, 11),
        svgText(620, rowY, line.jumlah, 12),
        svgText(750, rowY, line.keterangan, 11),
      ].join("\n");
    })
    .join("\n");

  const headerText = [
    svgText(450, 48, "SURAT JALAN", 30, { anchor: "middle" }),
    svgText(520, 78, "[REVISI GUDANG]", 14),
    svgText(40, 95, `Tanggal: ${doc.tanggal}`, 13),
    svgText(40, 118, `No: ${doc.noSuratJalan}`, 13),
    svgText(40, 141, `No. Kend: ${doc.noKendaraan}`, 13),
    svgText(40, 164, `No. PO: ${doc.noPo}`, 13),
    svgText(40, 190, `Kepada: ${doc.namaPenerima}`, 12),
    svgText(40, 210, doc.alamat, 11),
  ].join("\n");

  const tableHeaderY = headerBlock + 32;
  const tableHeader = [
    svgText(45, tableHeaderY, "NO.", 12),
    svgText(95, tableHeaderY, "BANYAKNYA", 12),
    svgText(205, tableHeaderY, "ISI", 12),
    svgText(325, tableHeaderY, "NAMA BARANG", 12),
    svgText(625, tableHeaderY, "JUMLAH", 12),
    svgText(755, tableHeaderY, "KETERANGAN", 12),
  ].join("\n");

  const footer = [
    svgText(40, h - 80, `Gudang: ${doc.gudang} | Supplier: ${doc.supplier}`, 12),
    svgTextMuted(40, h - 55, "Direvisi via GBC Inbound Intelligence", 11),
  ].join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <rect width="100%" height="100%" fill="#fff"/>
  ${headerText}
  <rect x="30" y="${headerBlock}" width="840" height="50" fill="#e8f5e9" stroke="${GREEN}"/>
  ${tableHeader}
  <rect x="30" y="${headerBlock + 50}" width="840" height="${tableRows * rowH + 20}" fill="none" stroke="${GREEN}"/>
  ${itemRows}
  ${footer}
</svg>`;
}

export async function renderSuratJalanRevisionPng(doc: OcrSheetDocumentDetail): Promise<Buffer> {
  const svg = buildSuratJalanRevisionSvg(doc);
  return sharp(Buffer.from(svg)).png().toBuffer();
}

/** `[REVISI] SJ_...png` — prefix, bukan suffix. */
export function revisionFileName(originalName: string): string {
  const withoutExt = originalName.replace(/\.[a-z0-9]+$/i, "").trim();
  const base = withoutExt
    .replace(/^\[REVISI\]\s*/i, "")
    .replace(/\s*\[REVISI\]$/i, "")
    .trim();
  if (!base) return "[REVISI] SuratJalan.png";
  return `[REVISI] ${base}.png`;
}
