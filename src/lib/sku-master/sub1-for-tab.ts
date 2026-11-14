import type { SkuMasterCodeOption } from "@/lib/sku-master/types";

/** Fallback jika kamus Sub 1 belum terbaca (sesuai sheet v2). */
const TAB_SUB1_FALLBACK: Record<string, string> = {
  PET: "PET",
  HDPE: "HDP",
  TUTUP: "TUT",
  KACA: "KAC",
  POT: "POT",
  LAINNYA: "LNN",
  "RESIN/ BAHAN BAKU": "RES",
};

/**
 * Sub 1 (kategori utama) mengikuti tab kategori yang dibuka — tidak boleh kosong.
 */
export function resolveSub1ForCategoryTab(
  categoryTab: string,
  sub1Options: SkuMasterCodeOption[]
): string {
  const tabToken = categoryTab.split("/")[0]!.trim();
  const tabUpper = tabToken.toUpperCase();

  if (sub1Options.length > 0) {
    const exact = sub1Options.find((o) => o.code.toUpperCase() === tabUpper);
    if (exact) return exact.code;

    const prefix3 = tabUpper.slice(0, 3);
    const byPrefix = sub1Options.find((o) => o.code.toUpperCase() === prefix3);
    if (byPrefix) return byPrefix.code;

    const byLabel = sub1Options.find(
      (o) =>
        o.label.toUpperCase().includes(tabUpper) ||
        tabUpper.includes(o.code.toUpperCase()) ||
        o.code.toUpperCase().includes(tabUpper.slice(0, 3))
    );
    if (byLabel) return byLabel.code;

    return sub1Options[0]!.code;
  }

  return TAB_SUB1_FALLBACK[categoryTab] ?? TAB_SUB1_FALLBACK[tabToken] ?? tabUpper.slice(0, 3);
}