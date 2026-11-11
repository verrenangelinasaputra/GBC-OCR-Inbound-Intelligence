import { afterEach, describe, it, expect } from "vitest";
import { hasPermission } from "@/lib/rbac/permissions";

describe("RBAC", () => {
  const prevSheet = process.env.SHEET_ONLY_MODE;

  afterEach(() => {
    if (prevSheet === undefined) delete process.env.SHEET_ONLY_MODE;
    else process.env.SHEET_ONLY_MODE = prevSheet;
  });

  it("supplier cannot view master prices by default", () => {
    expect(hasPermission(["SUPPLIER_USER"], "master_prices", "VIEW")).toBe(false);
  });
  it("super admin can manage users", () => {
    expect(hasPermission(["SUPER_ADMIN"], "users", "MANAGE")).toBe(true);
  });
  it("sheet mode: empty allowed_modules blocks menu modules", () => {
    process.env.SHEET_ONLY_MODE = "true";
    expect(hasPermission(["WAREHOUSE_OPERATOR"], "dashboard", "VIEW", [])).toBe(false);
    expect(hasPermission(["WAREHOUSE_OPERATOR"], "ocr_review", "VIEW", ["dashboard"])).toBe(false);
    expect(hasPermission(["WAREHOUSE_OPERATOR"], "dashboard", "VIEW", ["dashboard"])).toBe(true);
  });
});
