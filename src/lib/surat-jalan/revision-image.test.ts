import { describe, expect, it } from "vitest";
import { revisionFileName } from "./revision-image";

describe("revisionFileName", () => {
  it("prefixes [REVISI] and forces .png", () => {
    expect(revisionFileName("SJ_20231017_Testing_SG072236_Gudang Klapanunggal.jpeg")).toBe(
      "[REVISI] SJ_20231017_Testing_SG072236_Gudang Klapanunggal.png"
    );
  });

  it("normalizes names that already contain [REVISI]", () => {
    expect(revisionFileName("SJ_x [REVISI].png")).toBe("[REVISI] SJ_x.png");
    expect(revisionFileName("[REVISI] SJ_x.png")).toBe("[REVISI] SJ_x.png");
  });
});
