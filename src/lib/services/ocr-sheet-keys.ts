import {
  isMeaningfulOcrDataRow,
  OCR_SHEET_HEADERS,
  OCR_SHEET_LEGACY_HEADER,
} from "@/lib/providers/google-workspace/google-sj-export-rows";
import { mapOcrSheetRow } from "@/lib/providers/google-workspace/ocr-sheet-columns";

export { isMeaningfulOcrDataRow };

export function encodeOcrSheetDocKey(rawKey: string): string {
  return Buffer.from(rawKey, "utf8").toString("base64url");
}

export function decodeOcrSheetDocKey(docKey: string): string {
  return Buffer.from(docKey, "base64url").toString("utf8");
}

/** Cocokkan baris sheet dengan kunci dokumen (nama file atau noSj|tanggal|…). */
export function sheetRowMatchesDocKey(row: string[], rawKey: string): boolean {
  if (!isMeaningfulOcrDataRow(row)) return false;
  const fields = mapOcrSheetRow(row);
  const url = fields.fileUrl?.trim();
  if (url && url === rawKey) return true;
  if (fields.fileName && fields.fileName === rawKey) return true;
  const parts = rawKey.split("|");
  if (parts.length >= 2) {
    if (parts[0] === fields.noSuratJalan && parts[1] === fields.tanggal) return true;
  }
  return false;
}

export function firstRowIsOcrHeader(row: string[] | undefined): boolean {
  const first = String(row?.[0] ?? "").trim();
  return first === OCR_SHEET_HEADERS[0] || first === OCR_SHEET_LEGACY_HEADER;
}
