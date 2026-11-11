import { describe, expect, it } from "vitest";
import { revisionFileName } from "./revision-image";

describe("revisionFileName", () => {
  it("numbered prefix and .png", () => {
    expect(revisionFileName("SJ_20231017_Testing_SG072236_Gudang Klapanunggal.jpeg", 1)).toBe(
      "[REVISI 1] SJ_20231017_Testing_SG072236_Gudang Klapanunggal.png"
    );
    expect(revisionFileName("SJ_x.jpeg", 3)).toBe("[REVISI 3] SJ_x.png");
  });

  it("strips old revision tags from base name", () => {
    expect(revisionFileName("[REVISI 2] SJ_x.png", 4)).toBe("[REVISI 4] SJ_x.png");
  });
});
