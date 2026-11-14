import { describe, expect, it } from "vitest";
import { revisionFileName, revisionTableDataRowY, textWidth, wrapTextLines } from "./revision-image";

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

describe("revisionTableDataRowY", () => {
  it("first body row uses index 0 (not 1)", () => {
    expect(revisionTableDataRowY(0)).toBeLessThan(revisionTableDataRowY(1));
    expect(revisionTableDataRowY(0)).toBe(255 + 44 + 40 * 0.72);
  });
});

describe("wrapTextLines", () => {
  it("wraps keterangan panjang ke dalam lebar kolom", () => {
    const note =
      "Koreksi tulisan: BOTOL BR 250ML N24 PUTIH - BOTOL BR 250ML N24 HITAM M SS";
    const maxW = 188 - 12;
  const fontSize = 10;
    const lines = wrapTextLines(note, maxW, fontSize);
    expect(lines.length).toBeGreaterThan(1);
    for (const line of lines) {
      expect(textWidth(line, fontSize)).toBeLessThanOrEqual(maxW + 0.5);
    }
  });
});
