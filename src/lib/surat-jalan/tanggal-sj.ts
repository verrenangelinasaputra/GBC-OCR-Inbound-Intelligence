/** Tanggal SJ dari sheet biasanya `DD/MM/YYYY`. */
export function parseSjTanggalParts(tanggal: string): { day: number; month: number; year: number } | null {
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(String(tanggal ?? "").trim());
  if (!m) return null;
  const day = Number(m[1]);
  const month = Number(m[2]);
  const year = Number(m[3]);
  if (month < 1 || month > 12 || year < 1900) return null;
  return { day, month, year };
}

export function collectDistinctSjYears(tanggalList: string[]): number[] {
  const years = new Set<number>();
  for (const t of tanggalList) {
    const p = parseSjTanggalParts(t);
    if (p) years.add(p.year);
  }
  return [...years].sort((a, b) => b - a);
}

export const SJ_MONTH_OPTIONS: { value: number; label: string }[] = [
  { value: 1, label: "Januari" },
  { value: 2, label: "Februari" },
  { value: 3, label: "Maret" },
  { value: 4, label: "April" },
  { value: 5, label: "Mei" },
  { value: 6, label: "Juni" },
  { value: 7, label: "Juli" },
  { value: 8, label: "Agustus" },
  { value: 9, label: "September" },
  { value: 10, label: "Oktober" },
  { value: 11, label: "November" },
  { value: 12, label: "Desember" },
];
