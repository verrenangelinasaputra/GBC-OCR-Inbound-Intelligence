import { isMeaningfulOcrDataRow, OCR_SHEET_HEADERS } from "@/lib/providers/google-workspace/google-sj-export-rows";

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
  const fileName = String(row[12] ?? "").trim();
  if (fileName && fileName === rawKey) return true;
  const parts = rawKey.split("|");
  if (parts.length >= 2) {
    const noSj = String(row[2] ?? "").trim();
    const tanggal = String(row[1] ?? "").trim();
    if (parts[0] === noSj && parts[1] === tanggal) return true;
  }
  return false;
}

export function firstRowIsOcrHeader(row: string[] | undefined): boolean {
  return String(row?.[0] ?? "").trim() === OCR_SHEET_HEADERS[0];
}
