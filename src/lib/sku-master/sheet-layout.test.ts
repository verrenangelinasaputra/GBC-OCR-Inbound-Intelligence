import { describe, expect, it } from "vitest";
import { COL, columnIndexToA1, codePairColumns, tabelSubColumn } from "@/lib/sku-master/sheet-layout";

describe("sku-master sheet layout", () => {
  it("maps sub columns", () => {
    expect(tabelSubColumn(1)).toBe(COL.TABEL_SUB1);
    expect(tabelSubColumn(9)).toBe(COL.TABEL_SUB9);
  });

  it("maps code pairs for sub 1 and 2", () => {
    expect(codePairColumns(1)).toEqual({ code: 0, label: 1 });
    expect(codePairColumns(2)).toEqual({ code: 2, label: 3 });
  });

  it("columnIndexToA1", () => {
    expect(columnIndexToA1(COL.TABEL_NO, 5)).toBe("T5");
    expect(columnIndexToA1(0, 1)).toBe("A1");
  });
});