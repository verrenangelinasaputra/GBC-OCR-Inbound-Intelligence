import { PermissionAction } from "@prisma/client";
import type { AppModule, RoleCode } from "./modules";

export type PermissionKey = `${AppModule}:${PermissionAction}`;

/** Default permission matrix — dapat di-override via DB di versi mendatang */
const ROLE_MATRIX: Record<RoleCode, PermissionKey[]> = {
  SUPER_ADMIN: buildAll(),
  DBM_OPERATOR: [
    "dashboard:VIEW",
    "nkb:VIEW",
    "nkb:EDIT",
    "surat_jalan:VIEW",
    "surat_jalan:EDIT",
    "surat_jalan:SUBMIT",
    "ocr_review:VIEW",
    "ocr_review:EDIT",
    "ocr_review:SUBMIT",
    "sku_mapping:VIEW",
    "sku_mapping:CREATE",
    "sku_mapping:EDIT",
    "sku_mapping:APPROVE",
    "purchase_orders:VIEW",
    "purchase_orders:CREATE",
    "purchase_orders:EDIT",
    "purchase_orders:SUBMIT",
    "purchase_orders:APPROVE",
    "goods_receiving:VIEW",
    "discrepancies:VIEW",
    "discrepancies:EDIT",
    "discrepancies:SUBMIT",
    "master_prices:VIEW",
    "master_prices:CREATE",
    "master_prices:EDIT",
    "invoices:VIEW",
    "invoices:CREATE",
    "invoices:EDIT",
    "invoices:SUBMIT",
    "invoices:APPROVE",
    "accounts_payable:VIEW",
    "accounts_payable:CREATE",
    "accounts_payable:EDIT",
    "suppliers:VIEW",
    "reports:VIEW",
    "reports:EXPORT",
    "notifications:VIEW",
  ],
  WAREHOUSE_OPERATOR: [
    "dashboard:VIEW",
    "purchase_orders:VIEW",
    "goods_receiving:VIEW",
    "goods_receiving:CREATE",
    "goods_receiving:EDIT",
    "goods_receiving:SUBMIT",
    "discrepancies:VIEW",
    "discrepancies:CREATE",
    "discrepancies:EDIT",
    "discrepancies:SUBMIT",
    "notifications:VIEW",
  ],
  SUPPLIER_USER: [
    "supplier_portal:VIEW",
    "supplier_portal:CREATE",
    "supplier_portal:SUBMIT",
    "notifications:VIEW",
  ],
  MANAGEMENT_VIEWER: [
    "dashboard:VIEW",
    "nkb:VIEW",
    "surat_jalan:VIEW",
    "purchase_orders:VIEW",
    "goods_receiving:VIEW",
    "discrepancies:VIEW",
    "invoices:VIEW",
    "accounts_payable:VIEW",
    "reports:VIEW",
    "notifications:VIEW",
  ],
};

function buildAll(): PermissionKey[] {
  const actions: PermissionAction[] = [
    "VIEW",
    "CREATE",
    "EDIT",
    "SUBMIT",
    "APPROVE",
    "EXPORT",
    "MANAGE",
  ];
  const modules: AppModule[] = [
    "dashboard",
    "nkb",
    "surat_jalan",
    "ocr_review",
    "sku_mapping",
    "purchase_orders",
    "goods_receiving",
    "discrepancies",
    "master_prices",
    "invoices",
    "accounts_payable",
    "suppliers",
    "reports",
    "notifications",
    "audit_logs",
    "users",
    "integrations",
    "settings",
    "supplier_portal",
  ];
  return modules.flatMap((m) => actions.map((a) => `${m}:${a}` as PermissionKey));
}

export function hasPermission(roles: string[], module: AppModule, action: PermissionAction): boolean {
  if (roles.includes("SUPER_ADMIN")) return true;
  for (const role of roles as RoleCode[]) {
    const perms = ROLE_MATRIX[role];
    if (perms?.includes(`${module}:${action}` as PermissionKey)) return true;
  }
  return false;
}

export async function loadUserPermissions(userId: string): Promise<{
  roles: string[];
  permissions: Set<PermissionKey>;
}> {
  const { prisma } = await import("@/lib/db");
  const userRoles = await prisma.userRole.findMany({
    where: { userId },
    include: { role: true },
  });
  const roles = userRoles.map((ur) => ur.role.code);
  const permissions = new Set<PermissionKey>();
  for (const role of roles as RoleCode[]) {
    for (const p of ROLE_MATRIX[role] ?? []) {
      permissions.add(p);
    }
    if (role === "SUPER_ADMIN") {
      for (const p of buildAll()) permissions.add(p);
    }
  }
  return { roles, permissions };
}

export function requirePermission(
  roles: string[],
  module: AppModule,
  action: PermissionAction
): void {
  if (!hasPermission(roles, module, action)) {
    throw new Error("FORBIDDEN");
  }
}
