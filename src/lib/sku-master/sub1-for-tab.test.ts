import { describe, expect, it } from "vitest";
import { resolveSub1ForCategoryTab } from "@/lib/sku-master/sub1-for-tab";

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

  it("uses fallback when kamus kosong", () => {
    expect(resolveSub1ForCategoryTab("PET", [])).toBe("PET");
    expect(resolveSub1ForCategoryTab("HDPE", [])).toBe("HDP");
  });
});