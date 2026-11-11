import type { AppModule } from "@/lib/rbac/modules";

/** Modul yang bisa di-centang Super Admin per user (Opsi B). */
export const ASSIGNABLE_NAV_MODULES: {
  module: AppModule;
  label: string;
  href: string;
}[] = [
  { module: "dashboard", label: "Dashboard", href: "/dashboard" },
  { module: "nkb", label: "Incoming Shipments / NKB", href: "/nkb" },
  { module: "surat_jalan", label: "Surat Jalan Documents", href: "/surat-jalan" },
  { module: "ocr_review", label: "OCR Review Queue", href: "/ocr-review" },
  { module: "sku_mapping", label: "Product SKU Mapping", href: "/sku-mapping" },
  { module: "data_barang_masuk", label: "Data Barang Masuk", href: "/data-barang-masuk" },
  { module: "purchase_orders", label: "Purchase Orders (PP)", href: "/purchase-orders" },
  { module: "goods_receiving", label: "Goods Receiving", href: "/goods-receiving" },
  { module: "discrepancies", label: "Discrepancy Management", href: "/discrepancies" },
  { module: "master_prices", label: "Master Harga Beli", href: "/master-prices" },
  { module: "invoices", label: "Purchase Invoices", href: "/invoices" },
  { module: "accounts_payable", label: "Accounts Payable", href: "/accounts-payable" },
  { module: "suppliers", label: "Supplier Management", href: "/suppliers" },
  { module: "reports", label: "Reports & Analytics", href: "/reports" },
  { module: "notifications", label: "Notifications", href: "/notifications" },
  { module: "audit_logs", label: "Audit Logs", href: "/audit-logs" },
  { module: "users", label: "User & Role Management", href: "/users" },
  { module: "integrations", label: "Integration Settings", href: "/integrations" },
  { module: "settings", label: "System Settings", href: "/settings" },
];

export function pathnameToModule(pathname: string): AppModule | null {
  const entry = ASSIGNABLE_NAV_MODULES.find(
    (n) => pathname === n.href || pathname.startsWith(`${n.href}/`)
  );
  return entry?.module ?? null;
}

export function parseAllowedModulesCell(raw: string | undefined | null): AppModule[] {
  const text = String(raw ?? "").trim();
  if (!text) return [];
  const valid = new Set(ASSIGNABLE_NAV_MODULES.map((m) => m.module));
  return text
    .split(/[;|,]/)
    .map((s) => s.trim().toLowerCase() as AppModule)
    .filter((m) => valid.has(m));
}

export function formatAllowedModulesCell(modules: AppModule[]): string {
  return [...new Set(modules)].join(";");
}
