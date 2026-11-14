import { readFileSync } from "fs";
import path from "path";
import * as opentype from "opentype.js";
import sharp from "sharp";
import type { OcrSheetDocumentDetail } from "@/lib/services/ocr-sheet-detail";

const GREEN = "#007a3d";
const GREEN_LIGHT = "#c8e6c9";

const CANVAS_W = 900;
const MARGIN_RIGHT = 24;
const CONTENT_MAX_W = CANVAS_W - 40 - MARGIN_RIGHT;

const TABLE = {
  left: 24,
  width: 852,
  top: 255,
  headerH: 44,
  minRowH: 40,
};

/** Batas kolom (kiri → kanan): NO, BANYAKNYA, ISI, NAMA BARANG, JUMLAH, KETERANGAN */
const COL_X = [24, 64, 168, 268, 548, 688, 876] as const;

const CELL_PAD_X = 6;
const LINE_HEIGHT_RATIO = 1.22;
const ROW_PAD_Y = 10;

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

export function textWidth(text: string, fontSize: number): number {
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

function svgTextLines(
  lines: string[],
  x: number,
  firstBaselineY: number,
  fontSize: number,
  opts: TextOpts = {}
): string {
  const lineStep = fontSize * LINE_HEIGHT_RATIO;
  return lines
    .map((line, i) => svgText(x, firstBaselineY + i * lineStep, line, fontSize, opts))
    .join("\n");
}

function svgTextRight(xRight: number, y: number, text: string, fontSize: number): string {
  const w = textWidth(text, fontSize);
  return svgText(Math.max(40, xRight - w), y, text, fontSize);
}

export function wrapTextLines(text: string, maxWidth: number, fontSize: number): string[] {
  const t = String(text ?? "").trim();
  if (!t) return [""];
  if (textWidth(t, fontSize) <= maxWidth) return [t];

  const words = t.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";

  const pushChars = (word: string) => {
    let chunk = "";
    for (const ch of word) {
      const trial = chunk + ch;
      if (textWidth(trial, fontSize) > maxWidth && chunk) {
        lines.push(chunk);
        chunk = ch;
      } else {
        chunk = trial;
      }
    }
    current = chunk;
  };

  for (const word of words) {
    const trial = current ? `${current} ${word}` : word;
    if (textWidth(trial, fontSize) <= maxWidth) {
      current = trial;
    } else if (current) {
      lines.push(current);
      if (textWidth(word, fontSize) > maxWidth) pushChars(word);
      else current = word;
    } else if (textWidth(word, fontSize) > maxWidth) {
      pushChars(word);
    } else {
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines.length ? lines : [""];
}

function columnInnerWidth(col: number): number {
  return COL_X[col + 1] - COL_X[col] - CELL_PAD_X * 2;
}

function cellMidX(col: number): number {
  return (COL_X[col] + COL_X[col + 1]) / 2;
}

function headerTextY(): number {
  return TABLE.top + TABLE.headerH * 0.68;
}

function rowHeightForLineCount(lineCount: number, fontSize: number): number {
  if (lineCount <= 1) return TABLE.minRowH;
  const lineStep = fontSize * LINE_HEIGHT_RATIO;
  const contentH = fontSize + (lineCount - 1) * lineStep;
  return Math.max(TABLE.minRowH, Math.ceil(contentH + ROW_PAD_Y * 2));
}

function buildTableGrid(rowHeights: number[]): string {
  const bodyH = rowHeights.reduce((a, b) => a + b, 0);
  const totalH = TABLE.headerH + bodyH;
  const { left, width, top, headerH } = TABLE;
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
  let y = top + headerH;
  for (let r = 0; r < rowHeights.length - 1; r += 1) {
    y += rowHeights[r];
    lines.push(`<line x1="${left}" y1="${y}" x2="${right}" y2="${y}" stroke="${GREEN}" stroke-width="1"/>`);
  }
  return lines.join("\n");
}

function measureTableRowHeight(line: {
  banyaknya: string;
  isi: string;
  namaBarang: string;
  jumlah: string;
  keterangan: string;
}): number {
  const fsQty = 11;
  const fsName = 10;
  const fsNote = 10;
  const lineCounts = [
    wrapTextLines(line.banyaknya, columnInnerWidth(1), fsQty).length,
    wrapTextLines(line.isi, columnInnerWidth(2), fsQty).length,
    wrapTextLines(line.namaBarang, columnInnerWidth(3), fsName).length,
    wrapTextLines(line.jumlah, columnInnerWidth(4), fsQty).length,
    wrapTextLines(line.keterangan, columnInnerWidth(5), fsNote).length,
  ];
  const maxLines = Math.max(1, ...lineCounts);
  const maxFont = Math.max(fsQty, fsName, fsNote);
  return rowHeightForLineCount(maxLines, maxFont);
}

function renderTableRow(
  index: number,
  line: {
    banyaknya: string;
    isi: string;
    namaBarang: string;
    jumlah: string;
    keterangan: string;
  },
  rowTop: number,
  rowHeight: number
): string {
  const fsNo = 11;
  const fsQty = 11;
  const fsName = 10;
  const fsNote = 10;

  const cols = [
    {
      lines: [String(index + 1)],
      fontSize: fsNo,
      x: cellMidX(0),
      anchor: "middle" as const,
    },
    {
      lines: wrapTextLines(line.banyaknya, columnInnerWidth(1), fsQty),
      fontSize: fsQty,
      x: cellMidX(1),
      anchor: "middle" as const,
    },
    {
      lines: wrapTextLines(line.isi, columnInnerWidth(2), fsQty),
      fontSize: fsQty,
      x: cellMidX(2),
      anchor: "middle" as const,
    },
    {
      lines: wrapTextLines(line.namaBarang, columnInnerWidth(3), fsName),
      fontSize: fsName,
      x: COL_X[3] + CELL_PAD_X,
      anchor: "start" as const,
    },
    {
      lines: wrapTextLines(line.jumlah, columnInnerWidth(4), fsQty),
      fontSize: fsQty,
      x: cellMidX(4),
      anchor: "middle" as const,
    },
    {
      lines: wrapTextLines(line.keterangan, columnInnerWidth(5), fsNote),
      fontSize: fsNote,
      x: COL_X[5] + CELL_PAD_X,
      anchor: "start" as const,
    },
  ];

  const maxLines = Math.max(...cols.map((c) => c.lines.length));
  const maxFont = Math.max(...cols.map((c) => c.fontSize));
  const lineStep = maxFont * LINE_HEIGHT_RATIO;
  const blockH = maxFont + (maxLines - 1) * lineStep;
  const firstBaseline = rowTop + (rowHeight - blockH) / 2 + maxFont;

  return cols
    .map((col) =>
      svgTextLines(col.lines, col.x, firstBaseline, col.fontSize, {
        anchor: col.anchor === "middle" ? "middle" : "start",
      })
    )
    .join("\n");
}

/** @deprecated Gunakan layout baris dinamis; dipakai test regresi index baris. */
export function revisionTableDataRowY(rowIndex: number): number {
  return TABLE.top + TABLE.headerH + rowIndex * TABLE.minRowH + TABLE.minRowH * 0.72;
}

export function stripRevisionBaseName(originalName: string): string {
  return originalName
    .replace(/\.[a-z0-9]+$/i, "")
    .trim()
    .replace(/^\[REVISI(?:\s*\d+)?\]\s*/gi, "")
    .replace(/\s*\[REVISI(?:\s*\d+)?\]$/gi, "")
    .trim();
}

function stackedHeaderText(x: number, startY: number, lines: string[], fontSize: number): { svg: string; nextY: number } {
  let y = startY;
  const parts: string[] = [];
  const step = fontSize * LINE_HEIGHT_RATIO;
  for (const line of lines) {
    parts.push(svgText(x, y, line, fontSize));
    y += step;
  }
  return { svg: parts.join("\n"), nextY: y };
}

/** Gambar revisi SJ — grid hijau mirip SJ fisik. */
export function buildSuratJalanRevisionSvg(doc: OcrSheetDocumentDetail, revisionLabel?: string): string {
  const w = CANVAS_W;
  const revTag = revisionLabel?.trim() || "[REVISI GUDANG]";

  const sourceLines =
    doc.lines.length > 0
      ? doc.lines
      : [
          {
            banyaknya: "",
            isi: "",
            namaBarang: "",
            jumlah: "",
            keterangan: "",
          },
        ];

  const rowHeights = sourceLines.map((line) => measureTableRowHeight(line));

  let rowTop = TABLE.top + TABLE.headerH;
  const dataRows = sourceLines
    .map((line, i) => {
      const h = rowHeights[i] ?? TABLE.minRowH;
      const svg = renderTableRow(i, line, rowTop, h);
      rowTop += h;
      return svg;
    })
    .join("\n");

  const tableBottom = TABLE.top + TABLE.headerH + rowHeights.reduce((a, b) => a + b, 0);
  const h = tableBottom + 160;

  const headerLabels = ["NO.", "BANYAKNYA", "ISI", "NAMA BARANG", "JUMLAH", "KETERANGAN"];
  const tableHeader = headerLabels
    .map((label, col) => {
      const wrapped = wrapTextLines(label, columnInnerWidth(col), 11);
      const lineStep = 11 * LINE_HEIGHT_RATIO;
      const baseY = headerTextY() - ((wrapped.length - 1) * lineStep) / 2;
      return svgTextLines(wrapped, cellMidX(col), baseY, 11, { anchor: "middle" });
    })
    .join("\n");

  const alamatLines = wrapTextLines(doc.alamat, CONTENT_MAX_W, 10);
  const alamatBlock = stackedHeaderText(40, 158, alamatLines, 10);

  const metaY = 95;
  const noPoText = `No. PO: ${doc.noPo || "-"}`;
  const noSjText = `No: ${doc.noSuratJalan}`;
  const noKendText = `No. Kend: ${doc.noKendaraan}`;
  const metaFs = 12;
  const metaLines = [
    wrapTextLines(noPoText, 220, metaFs),
    wrapTextLines(noSjText, 220, metaFs),
    wrapTextLines(noKendText, CONTENT_MAX_W - 500, metaFs),
  ];

  const tanggalLines = wrapTextLines(`Tanggal: ${doc.tanggal}`, 220, metaFs);
  const tanggalRight = w - MARGIN_RIGHT;

  const blockHeader = [
    ...wrapTextLines(revTag, 260, 16).map((line, i) => svgText(40, 52 + i * 16 * LINE_HEIGHT_RATIO, line, 16)),
    svgText(w / 2, 52, "SURAT JALAN", 28, { anchor: "middle" }),
    ...tanggalLines.map((line, i) => svgTextRight(tanggalRight, 52 + i * metaFs * LINE_HEIGHT_RATIO, line, metaFs)),
    svgTextLines(metaLines[0], 40, metaY, metaFs),
    svgTextLines(metaLines[1], 280, metaY, metaFs),
    ...metaLines[2].map((line, i) => svgText(520, metaY + i * metaFs * LINE_HEIGHT_RATIO, line, metaFs)),
    svgText(40, 118, "Kepada Yth:", 11),
    svgText(40, 138, doc.namaPenerima, 12),
    alamatBlock.svg,
  ].join("\n");

  const footY = tableBottom + 48;
  const footerMeta = wrapTextLines(`Gudang: ${doc.gudang} | Supplier: ${doc.supplier}`, CONTENT_MAX_W, 10);
  const footerMetaBlock = stackedHeaderText(40, footY + 72, footerMeta, 10);
  const footer = [
    svgText(80, footY, "Tanda Terima", 11, { anchor: "middle" }),
    svgText(w / 2, footY, "Mengetahui", 11, { anchor: "middle" }),
    svgText(780, footY, "Hormat Kami", 11, { anchor: "middle" }),
    `<line x1="24" y1="${footY + 36}" x2="200" y2="${footY + 36}" stroke="${GREEN}"/>`,
    `<line x1="360" y1="${footY + 36}" x2="540" y2="${footY + 36}" stroke="${GREEN}"/>`,
    `<line x1="680" y1="${footY + 36}" x2="860" y2="${footY + 36}" stroke="${GREEN}"/>`,
    footerMetaBlock.svg,
    svgTextMuted(40, footerMetaBlock.nextY + 4, "Direvisi via GBC Inbound Intelligence", 9),
  ].join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" overflow="visible">
  <rect width="100%" height="100%" fill="#fff"/>
  ${blockHeader}
  ${buildTableGrid(rowHeights)}
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
