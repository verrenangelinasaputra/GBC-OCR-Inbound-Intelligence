/** Angka dari sel "No" (toleran teks campuran). */
export function parseSheetNoCell(raw: string | undefined | null): number {
  const n = Number(String(raw ?? "").trim().replace(/\D/g, ""));
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/** No berikutnya untuk kolom A (atau kolom indeks tertentu) dari slice values sheet. */
export function nextAutoIncrementNo(rows: string[][], columnIndex = 0, startAt = 1): string {
  let max = 0;
  for (const row of rows) {
    const n = parseSheetNoCell(row[columnIndex]);
    if (n > max) max = n;
  }
  const next = max > 0 ? max + 1 : startAt;
  return String(next);
}