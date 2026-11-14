import { describe, expect, it } from "vitest";
import {
  resolveSub1ForCategoryTab,
  resolveSub1ForSave,
  sub1FieldMode,
} from "@/lib/sku-master/sub1-for-tab";

const kacaOptions = [
  { code: "BKC", label: "Botol Kaca", sheetRow: 5 },
  { code: "BKP", label: "Botol Kaca Part", sheetRow: 6 },
  { code: "PKB", label: "Parfum Kaca Botol", sheetRow: 7 },
];

describe("sub1FieldMode", () => {
  it("dropdown when many KACA codes", () => {
    expect(sub1FieldMode(kacaOptions)).toBe("dropdown");
  });
  it("dropdown even when single PET code", () => {
    expect(sub1FieldMode([{ code: "PET", label: "PET", sheetRow: 4 }])).toBe("dropdown");
  });
});

describe("resolveSub1ForCategoryTab", () => {
  it("matches PET tab to PET code", () => {
    expect(
      resolveSub1ForCategoryTab("PET", [{ code: "PET", label: "PET", sheetRow: 5 }])
    ).toBe("PET");
  });

  it("matches HDPE tab to HDP code", () => {
    expect(
      resolveSub1ForCategoryTab("HDPE", [{ code: "HDP", label: "HDPE", sheetRow: 5 }])
    ).toBe("HDP");
  });

  it("does not auto-pick first code for KACA", () => {
    expect(resolveSub1ForCategoryTab("KACA", kacaOptions)).toBe("");
  });

  it("uses fallback when kamus kosong", () => {
    expect(resolveSub1ForCategoryTab("PET", [])).toBe("PET");
    expect(resolveSub1ForCategoryTab("KACA", [])).toBe("BKC");
  });
});

describe("resolveSub1ForSave", () => {
  it("requires pick when many options", () => {
    expect(() => resolveSub1ForSave("KACA", "", kacaOptions)).toThrow(/wajib dipilih/);
    expect(resolveSub1ForSave("KACA", "BKP", kacaOptions)).toBe("BKP");
  });
});