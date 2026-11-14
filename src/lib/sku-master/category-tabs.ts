/** Tab kategori dengan TABEL 1 (generator master produk). */
export const SKU_GENERATOR_CATEGORY_TABS = [
  "PET",
  "HDPE",
  "TUTUP",
  "KACA",
  "POT",
  "LAINNYA",
  "RESIN/ BAHAN BAKU",
] as const;

export type SkuGeneratorCategoryTab = (typeof SKU_GENERATOR_CATEGORY_TABS)[number];

/** Tab yang masuk agregasi REKAP SKUS (6 kategori utama). */
export const SKU_SKUS_CATEGORY_TABS = ["PET", "HDPE", "TUTUP", "KACA", "POT", "LAINNYA"] as const;

export function isGeneratorCategoryTab(tab: string): tab is SkuGeneratorCategoryTab {
  return (SKU_GENERATOR_CATEGORY_TABS as readonly string[]).includes(tab);
}