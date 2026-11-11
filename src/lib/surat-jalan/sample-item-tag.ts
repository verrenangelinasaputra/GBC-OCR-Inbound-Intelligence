export const SAMPLE_ITEM_TAG = ["BARANG SAMPLE", "BUKAN BARANG SAMPLE"] as const;
export type SampleItemTag = (typeof SAMPLE_ITEM_TAG)[number];

export const DEFAULT_SAMPLE_ITEM_TAG: SampleItemTag = "BUKAN BARANG SAMPLE";

export function normalizeSampleItemTag(raw: string | undefined | null): SampleItemTag {
  const t = String(raw ?? "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, " ");
  if (t.includes("BUKAN") && t.includes("SAMPLE")) return "BUKAN BARANG SAMPLE";
  if (t.includes("SAMPLE") || t.includes("SAMPEL")) return "BARANG SAMPLE";
  return DEFAULT_SAMPLE_ITEM_TAG;
}

/** Deteksi dari teks keterangan / catatan / nama barang. */
export function inferSampleItemTag(...textParts: Array<string | undefined | null>): SampleItemTag {
  const blob = textParts
    .map((p) => String(p ?? "").toLowerCase())
    .join(" ");
  if (/\b(sample|sampel|contoh)\b/.test(blob)) return "BARANG SAMPLE";
  return DEFAULT_SAMPLE_ITEM_TAG;
}

export function sampleTagLabel(tag: SampleItemTag): string {
  return tag;
}
