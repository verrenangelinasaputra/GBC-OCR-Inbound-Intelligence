import { describe, expect, it } from "vitest";
import { formulaArgSeparator, resolveDataCompilationTabTitle } from "./inbound-monitoring-layout";

describe("inbound monitoring formulas", () => {
  it("uses semicolon for Indonesian locale", () => {
    expect(formulaArgSeparator("id_ID")).toBe(";");
  });

  it("resolves Sheet1 when Data Compilation missing", () => {
    expect(resolveDataCompilationTabTitle(["Sheet1", "Summary"])).toBe("Sheet1");
    expect(resolveDataCompilationTabTitle(["Data Compilation", "Sheet1"])).toBe("Data Compilation");
  });
});
