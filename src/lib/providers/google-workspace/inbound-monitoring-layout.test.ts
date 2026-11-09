import { describe, expect, it } from "vitest";
import {
  dataCalcColumnFormulasForLocale,
  formulaArgSeparator,
  resolveDataCompilationTabTitle,
  SUMMARY_QUERY_LAYOUT,
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

  it("reserves row gaps between Summary QUERY anchors", () => {
    expect(SUMMARY_QUERY_LAYOUT.weeklyBlockEnd).toBeGreaterThan(SUMMARY_QUERY_LAYOUT.weeklyQuery);
    expect(SUMMARY_QUERY_LAYOUT.itemHeader).toBeGreaterThan(SUMMARY_QUERY_LAYOUT.weeklyBlockEnd);
    expect(SUMMARY_QUERY_LAYOUT.deliveryHeader).toBeGreaterThan(SUMMARY_QUERY_LAYOUT.itemBlockEnd);
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
