export const MODULES = [
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
] as const;

export type AppModule = (typeof MODULES)[number];

export type RoleCode =
  | "SUPER_ADMIN"
  | "DBM_OPERATOR"
  | "WAREHOUSE_OPERATOR"
  | "SUPPLIER_USER"
  | "MANAGEMENT_VIEWER";

export const ROLE_LABELS: Record<RoleCode, string> = {
  SUPER_ADMIN: "Super Admin",
  DBM_OPERATOR: "DBM / Purchasing Operator",
  WAREHOUSE_OPERATOR: "Warehouse Operator",
  SUPPLIER_USER: "Supplier / External User",
  MANAGEMENT_VIEWER: "Management / Viewer",
};
