/** Nilai aman dari sel sheet / JSON — hindari `.trim()` pada undefined. */
export function coerceSheetCell(value: unknown): string {
  return String(value ?? "").trim();
}