/** Ambil angka pertama dari teks jumlah (mis. `16704 PCS`). */
export function parseQuantityAmount(text: string | undefined | null): { amount: number; unit: string } {
  const raw = String(text ?? "").trim();
  const m = /^([\d.,]+)\s*(.*)$/i.exec(raw.replace(/\s+/g, " "));
  if (!m) return { amount: 0, unit: "" };
  const n = Number(m[1].replace(/\./g, "").replace(",", "."));
  return { amount: Number.isFinite(n) ? n : 0, unit: (m[2] ?? "").trim() };
}
