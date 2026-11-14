import type { SkuMasterCodeOption } from "@/lib/sku-master/types";

/** Fallback kode jika kamus Sub 1 kosong (belum sync / tab baru). */
const TAB_SUB1_FALLBACK: Record<string, string> = {
  PET: "PET",
  HDPE: "HDP",
  TUTUP: "TUT",
  KACA: "BKC",
  POT: "POT",
  LAINNYA: "LNN",
  "RESIN/ BAHAN BAKU": "RES",
};

export type Sub1FieldMode = "locked" | "dropdown" | "category-name";

export function categoryTabDisplayName(categoryTab: string): string {
  return categoryTab.split("/")[0]!.trim();
}

/** Satu kode = kunci; banyak kode (mis. KACA: BKC, BKP, …) = dropdown; kosong = nama tab + fallback kode. */
export function sub1FieldMode(sub1Options: SkuMasterCodeOption[]): Sub1FieldMode {
  if (sub1Options.length === 0) return "category-name";
  if (sub1Options.length === 1) return "locked";
  return "dropdown";
}

/**
 * Auto hanya jika Sub 1 tunggal atau tab punya pasangan 1:1 (PET, HDP untuk HDPE).
 * Jangan ambil opsi pertama (menghindari BKP dipilih untuk semua baris KACA).
 */
export function resolveSub1ForCategoryTab(
  categoryTab: string,
  sub1Options: SkuMasterCodeOption[]
): string {
  const tabToken = categoryTabDisplayName(categoryTab);
  const tabUpper = tabToken.toUpperCase();

  if (sub1Options.length === 1) return sub1Options[0]!.code;

  if (sub1Options.length === 0) {
    return TAB_SUB1_FALLBACK[categoryTab] ?? TAB_SUB1_FALLBACK[tabToken] ?? tabUpper.slice(0, 3);
  }

  const exact = sub1Options.find((o) => o.code.toUpperCase() === tabUpper);
  if (exact) return exact.code;

  if (tabUpper === "HDPE") {
    const hdp = sub1Options.find((o) => o.code.toUpperCase() === "HDP");
    if (hdp) return hdp.code;
  }

  return "";
}

export function resolveSub1ForSave(
  categoryTab: string,
  sub1Input: string,
  sub1Options: SkuMasterCodeOption[]
): string {
  const trimmed = sub1Input.trim();
  if (trimmed) return trimmed;

  const mode = sub1FieldMode(sub1Options);
  if (mode === "dropdown") {
    throw new Error("Sub 1 (kategori utama) wajib dipilih — pilih dari daftar kode di tab ini.");
  }

  return resolveSub1ForCategoryTab(categoryTab, sub1Options);
}