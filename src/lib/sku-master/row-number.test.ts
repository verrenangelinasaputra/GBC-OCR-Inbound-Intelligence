import { describe, expect, it } from "vitest";
import { nextAutoIncrementNo, parseSheetNoCell } from "@/lib/sku-master/row-number";

describe("parseSheetNoCell", () => {
  it("parses angka", () => {
    expect(parseSheetNoCell("12")).toBe(12);
    expect(parseSheetNoCell("No. 7")).toBe(7);
    expect(parseSheetNoCell("")).toBe(0);
  });
});

describe("nextAutoIncrementNo", () => {
  it("increment dari max kolom", () => {
    expect(nextAutoIncrementNo([["1"], ["3"], ["2"]])).toBe("4");
    expect(nextAutoIncrementNo([["No"], ["Produk"]])).toBe("1");
  });
});