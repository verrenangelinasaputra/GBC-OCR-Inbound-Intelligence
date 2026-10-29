import { describe, it, expect } from "vitest";
import { hasPermission } from "@/lib/rbac/permissions";

describe("RBAC", () => {
  it("supplier cannot view master prices by default", () => {
    expect(hasPermission(["SUPPLIER_USER"], "master_prices", "VIEW")).toBe(false);
  });
  it("super admin can manage users", () => {
    expect(hasPermission(["SUPER_ADMIN"], "users", "MANAGE")).toBe(true);
  });
});
