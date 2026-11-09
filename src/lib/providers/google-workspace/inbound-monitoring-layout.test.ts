import { describe, expect, it } from "vitest";
import {
  dataCalcColumnFormulasForLocale,
  formulaArgSeparator,
  resolveDataCompilationTabTitle,
  SUMMARY_BAND_LAYOUT,
} from "./inbound-monitoring-layout";

function parenBalance(s: string): number {
  let n = 0;
  for (const ch of s) {
    if (ch === "(") n += 1;
    if (ch === ")") n -= 1;
  }
  return n;
}

describe("inbound monitoring formulas", () => {
  it("uses semicolon for Indonesian locale", () => {
    expect(formulaArgSeparator("in_ID")).toBe(";");
    expect(formulaArgSeparator("id_ID")).toBe(";");
  });

  it("resolves Sheet1 when Data Compilation missing", () => {
    expect(resolveDataCompilationTabTitle(["Sheet1", "Summary"])).toBe("Sheet1");
    expect(resolveDataCompilationTabTitle(["Data Compilation", "Sheet1"])).toBe("Data Compilation");
  });

  it("places Summary QUERY bands on separate columns at the same row", () => {
    const { bandColIndex, queryRow } = SUMMARY_BAND_LAYOUT;
    expect(queryRow).toBe(20);
    expect(bandColIndex.item).toBeGreaterThan(bandColIndex.weekly + 2);
    expect(bandColIndex.delivery).toBeGreaterThan(bandColIndex.item + 5);
    expect(bandColIndex.supplier).toBeGreaterThan(bandColIndex.delivery + 8);
    expect(bandColIndex.warehouse).toBeGreaterThan(bandColIndex.supplier + 5);
  });

  it("generates balanced ARRAYFORMULA with empty IF branch for id_ID", () => {
    const formulas = dataCalcColumnFormulasForLocale("Data Compilation", "id_ID");
    expect(formulas.length).toBe(10);
    for (const f of formulas) {
      expect(f.startsWith("=ARRAYFORMULA(")).toBe(true);
      expect(parenBalance(f)).toBe(0);
      expect(f).toMatch(/LEN\([^)]+\)=0;"";/);
      expect(f).toContain(";");
    }
  });
});
