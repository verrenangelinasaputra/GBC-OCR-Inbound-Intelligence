import sharp from "sharp";
import type { OcrSheetDocumentDetail } from "@/lib/services/ocr-sheet-detail";

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
}

/** Gambar revisi SJ — layout hijau mirip contoh fisik (dot matrix). */
export function buildSuratJalanRevisionSvg(doc: OcrSheetDocumentDetail): string {
  const w = 900;
  const rowH = 36;
  const headerBlock = 220;
  const tableRows = doc.lines.length;
  const h = headerBlock + 80 + tableRows * rowH + 140;

  const itemRows = doc.lines
    .map((line, i) => {
      const no = i + 1;
      return `<text x="40" y="${headerBlock + 55 + i * rowH}" fill="#0a5" font-size="13" font-family="Consolas,monospace">${no}</text>
<text x="90" y="${headerBlock + 55 + i * rowH}" fill="#0a5" font-size="12" font-family="Consolas,monospace">${esc(line.banyaknya)}</text>
<text x="200" y="${headerBlock + 55 + i * rowH}" fill="#0a5" font-size="12" font-family="Consolas,monospace">${esc(line.isi)}</text>
<text x="320" y="${headerBlock + 55 + i * rowH}" fill="#0a5" font-size="11" font-family="Consolas,monospace">${esc(line.namaBarang)}</text>
<text x="620" y="${headerBlock + 55 + i * rowH}" fill="#0a5" font-size="12" font-family="Consolas,monospace">${esc(line.jumlah)}</text>
<text x="750" y="${headerBlock + 55 + i * rowH}" fill="#0a5" font-size="11" font-family="Consolas,monospace">${esc(line.keterangan)}</text>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <rect width="100%" height="100%" fill="#fff"/>
  <text x="450" y="48" text-anchor="middle" fill="#0a5" font-size="28" font-weight="bold" font-family="Arial,sans-serif">SURAT JALAN</text>
  <text x="520" y="78" fill="#0a5" font-size="14" font-family="Arial,sans-serif">[REVISI GUDANG]</text>
  <text x="40" y="95" fill="#0a5" font-size="13" font-family="Arial,sans-serif">Tanggal: ${esc(doc.tanggal)}</text>
  <text x="40" y="118" fill="#0a5" font-size="13" font-family="Arial,sans-serif">No: ${esc(doc.noSuratJalan)}</text>
  <text x="40" y="141" fill="#0a5" font-size="13" font-family="Arial,sans-serif">No. Kend: ${esc(doc.noKendaraan)}</text>
  <text x="40" y="164" fill="#0a5" font-size="13" font-family="Arial,sans-serif">No. PO: ${esc(doc.noPo)}</text>
  <text x="40" y="190" fill="#0a5" font-size="12" font-family="Arial,sans-serif">Kepada: ${esc(doc.namaPenerima)}</text>
  <text x="40" y="210" fill="#0a5" font-size="11" font-family="Arial,sans-serif">${esc(doc.alamat)}</text>
  <rect x="30" y="${headerBlock}" width="840" height="50" fill="#e8f5e9" stroke="#0a5"/>
  <text x="45" y="${headerBlock + 32}" fill="#0a5" font-weight="bold" font-size="12">NO.</text>
  <text x="95" y="${headerBlock + 32}" fill="#0a5" font-weight="bold" font-size="12">BANYAKNYA</text>
  <text x="205" y="${headerBlock + 32}" fill="#0a5" font-weight="bold" font-size="12">ISI</text>
  <text x="325" y="${headerBlock + 32}" fill="#0a5" font-weight="bold" font-size="12">NAMA BARANG</text>
  <text x="625" y="${headerBlock + 32}" fill="#0a5" font-weight="bold" font-size="12">JUMLAH</text>
  <text x="755" y="${headerBlock + 32}" fill="#0a5" font-weight="bold" font-size="12">KETERANGAN</text>
  <rect x="30" y="${headerBlock + 50}" width="840" height="${tableRows * rowH + 20}" fill="none" stroke="#0a5"/>
  ${itemRows}
  <text x="40" y="${h - 80}" fill="#0a5" font-size="12">Gudang: ${esc(doc.gudang)} · Supplier: ${esc(doc.supplier)}</text>
  <text x="40" y="${h - 55}" fill="#666" font-size="11">Direvisi via GBC Inbound Intelligence</text>
</svg>`;
}

export async function renderSuratJalanRevisionPng(doc: OcrSheetDocumentDetail): Promise<Buffer> {
  const svg = buildSuratJalanRevisionSvg(doc);
  return sharp(Buffer.from(svg)).png().toBuffer();
}

export function revisionFileName(originalName: string): string {
  const base = originalName.replace(/\.[a-z0-9]+$/i, "");
  const ext = originalName.match(/\.[a-z0-9]+$/i)?.[0] || ".png";
  if (base.includes("[REVISI]")) return originalName;
  return `${base} [REVISI]${ext.replace(/\.[a-z]+$/i, ".png")}`;
}
