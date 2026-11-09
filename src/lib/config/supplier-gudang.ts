export const SUPPLIER_GUDANG_OPTIONS = [
  "Gudang Karanggan",
  "Gudang Loumina",
  "Gudang Klapanunggal",
  "Gudang Barata",
  "Gudang Kijang",
  "Gudang Kediri",
] as const;

export type SupplierGudang = (typeof SUPPLIER_GUDANG_OPTIONS)[number];

const GUDANG_SET = new Set<string>(SUPPLIER_GUDANG_OPTIONS);

/** Satu atau banyak gudang; disimpan di sheet sebagai nilai dipisah `;`. */
export function normalizeGudangSelection(raw: unknown): string {
  const items: string[] = [];
  if (Array.isArray(raw)) {
    for (const entry of raw) {
      const g = String(entry ?? "").trim();
      if (g) items.push(g);
    }
  } else {
    const text = String(raw ?? "").trim();
    if (text) {
      for (const part of text.split(/[;|]/)) {
        const g = part.trim();
        if (g) items.push(g);
      }
    }
  }
  const unique = [...new Set(items)];
  if (!unique.length) {
    throw new Error("Pilih minimal satu gudang tujuan.");
  }
  for (const g of unique) {
    if (!GUDANG_SET.has(g)) {
      throw new Error("Pilih gudang tujuan yang valid.");
    }
  }
  return unique.join("; ");
}

export const SUPPLIER_MAX_SJ_FILES = 10;
