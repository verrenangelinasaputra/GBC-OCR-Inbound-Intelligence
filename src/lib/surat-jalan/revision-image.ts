import { readFileSync } from "fs";
import path from "path";
import * as opentype from "opentype.js";
import sharp from "sharp";
import type { OcrSheetDocumentDetail } from "@/lib/services/ocr-sheet-detail";

const GREEN = "#007a3d";
const GREEN_LIGHT = "#c8e6c9";

const TABLE = {
  left: 24,
  width: 852,
  top: 255,
  headerH: 44,
  rowH: 40,
};

/** Batas kolom (kiri → kanan): NO, BANYAKNYA, ISI, NAMA BARANG, JUMLAH, KETERANGAN */
const COL_X = [24, 64, 168, 268, 548, 688, 876] as const;

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

function textWidth(text: string, fontSize: number): number {
  const font = getRevisionFont();
  const scale = fontSize / font.unitsPerEm;
  let w = 0;
  for (const ch of text || " ") {
    w += glyphAdvance(font.charToGlyph(ch), scale);
  }
  return w;
}

type TextOpts = { anchor?: "start" | "middle" };

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

function cellMidX(col: number): number {
  return (COL_X[col] + COL_X[col + 1]) / 2;
}

function cellTextY(rowIndex: number, inHeader = false): number {
  const base = TABLE.top + (inHeader ? TABLE.headerH * 0.68 : TABLE.headerH + rowIndex * TABLE.rowH + TABLE.rowH * 0.72);
  return base;
}

function buildTableGrid(rowCount: number): string {
  const bodyH = rowCount * TABLE.rowH;
  const totalH = TABLE.headerH + bodyH;
  const { left, width, top, headerH, rowH } = TABLE;
  const right = left + width;
  const bottom = top + totalH;
  const lines: string[] = [
    `<rect x="${left}" y="${top}" width="${width}" height="${totalH}" fill="#fff" stroke="${GREEN}" stroke-width="1.5"/>`,
    `<rect x="${left}" y="${top}" width="${width}" height="${headerH}" fill="${GREEN_LIGHT}" stroke="none"/>`,
    `<line x1="${left}" y1="${top + headerH}" x2="${right}" y2="${top + headerH}" stroke="${GREEN}" stroke-width="1.2"/>`,
  ];
  for (let c = 1; c < COL_X.length - 1; c += 1) {
    const x = COL_X[c];
    lines.push(
      `<line x1="${x}" y1="${top}" x2="${x}" y2="${bottom}" stroke="${GREEN}" stroke-width="1"/>`
    );
  }
  for (let r = 1; r < rowCount; r += 1) {
    const y = top + headerH + r * rowH;
    lines.push(`<line x1="${left}" y1="${y}" x2="${right}" y2="${y}" stroke="${GREEN}" stroke-width="1"/>`);
  }
  return lines.join("\n");
}

export function stripRevisionBaseName(originalName: string): string {
  return originalName
    .replace(/\.[a-z0-9]+$/i, "")
    .trim()
    .replace(/^\[REVISI(?:\s*\d+)?\]\s*/gi, "")
    .replace(/\s*\[REVISI(?:\s*\d+)?\]$/gi, "")
    .trim();
}

/** Gambar revisi SJ — grid hijau mirip SJ fisik. */
export function buildSuratJalanRevisionSvg(doc: OcrSheetDocumentDetail, revisionLabel?: string): string {
  const rowCount = Math.max(doc.lines.length, 1);
  const tableBottom = TABLE.top + TABLE.headerH + rowCount * TABLE.rowH;
  const h = tableBottom + 160;
  const w = 900;

  const headerLabels = ["NO.", "BANYAKNYA", "ISI", "NAMA BARANG", "JUMLAH", "KETERANGAN"];
  const tableHeader = headerLabels
    .map((label, col) => svgText(cellMidX(col), cellTextY(0, true), label, 11, { anchor: "middle" }))
    .join("\n");

  const dataRows = (doc.lines.length ? doc.lines : [{
    banyaknya: "",
    isi: "",
    namaBarang: "",
    jumlah: "",
    keterangan: "",
  }])
    .map((line, i) => {
      const row = i + 1;
      return [
        svgText(cellMidX(0), cellTextY(row), String(row), 11, { anchor: "middle" }),
        svgText(cellMidX(1), cellTextY(row), line.banyaknya, 11, { anchor: "middle" }),
        svgText(cellMidX(2), cellTextY(row), line.isi, 11, { anchor: "middle" }),
        svgText(COL_X[3] + 8, cellTextY(row), line.namaBarang, 10),
        svgText(cellMidX(4), cellTextY(row), line.jumlah, 11, { anchor: "middle" }),
        svgText(COL_X[5] + 6, cellTextY(row), line.keterangan, 10),
      ].join("\n");
    })
    .join("\n");

  const revTag = revisionLabel?.trim() || "[REVISI GUDANG]";

  const blockHeader = [
    svgText(80, 52, revTag, 16),
    svgText(450, 52, "SURAT JALAN", 28, { anchor: "middle" }),
    svgText(720, 52, `Tanggal: ${doc.tanggal}`, 12),
    svgText(40, 95, `No. PO: ${doc.noPo || "-"}`, 12),
    svgText(280, 95, `No: ${doc.noSuratJalan}`, 12),
    svgText(520, 95, `No. Kend: ${doc.noKendaraan}`, 12),
    svgText(40, 118, "Kepada Yth:", 11),
    svgText(40, 138, doc.namaPenerima, 12),
    svgText(40, 158, doc.alamat, 10),
  ].join("\n");

  const footY = tableBottom + 48;
  const footer = [
    svgText(80, footY, "Tanda Terima", 11, { anchor: "middle" }),
    svgText(450, footY, "Mengetahui", 11, { anchor: "middle" }),
    svgText(780, footY, "Hormat Kami", 11, { anchor: "middle" }),
    `<line x1="24" y1="${footY + 36}" x2="200" y2="${footY + 36}" stroke="${GREEN}"/>`,
    `<line x1="360" y1="${footY + 36}" x2="540" y2="${footY + 36}" stroke="${GREEN}"/>`,
    `<line x1="680" y1="${footY + 36}" x2="860" y2="${footY + 36}" stroke="${GREEN}"/>`,
    svgText(40, footY + 72, `Gudang: ${doc.gudang} | Supplier: ${doc.supplier}`, 10),
    svgTextMuted(40, footY + 92, "Direvisi via GBC Inbound Intelligence", 9),
  ].join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <rect width="100%" height="100%" fill="#fff"/>
  ${blockHeader}
  ${buildTableGrid(rowCount)}
  ${tableHeader}
  ${dataRows}
  ${footer}
</svg>`;
}

export async function renderSuratJalanRevisionPng(
  doc: OcrSheetDocumentDetail,
  revisionSequence?: number
): Promise<Buffer> {
  const label =
    revisionSequence && revisionSequence > 0 ? `[REVISI ${revisionSequence} GUDANG]` : "[REVISI GUDANG]";
  const svg = buildSuratJalanRevisionSvg(doc, label);
  return sharp(Buffer.from(svg)).png().toBuffer();
}

export function revisionFileName(originalName: string, sequence: number): string {
  const base = stripRevisionBaseName(originalName) || "SuratJalan";
  const n = Math.max(1, Math.floor(sequence));
  return `[REVISI ${n}] ${base}.png`;
}
