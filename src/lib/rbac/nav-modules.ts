import type { AppModule } from "@/lib/rbac/modules";

/** Menu operasional GBC — hanya modul ini yang tampil & bisa di-assign ke user. */
export const PORTAL_NAV_MODULES: {
  module: AppModule;
  label: string;
  href: string;
}[] = [
  { module: "dashboard", label: "Dashboard", href: "/dashboard" },
  { module: "ocr_review", label: "OCR Review Queue", href: "/ocr-review" },
  { module: "sku_mapping", label: "Product SKU Mapping", href: "/sku-mapping" },
  { module: "master_mapping", label: "Master Mapping", href: "/master-mapping" },
  { module: "data_barang_masuk", label: "Data Barang Masuk", href: "/data-barang-masuk" },
  { module: "users", label: "User & Role Management", href: "/users" },
];

/** Alias untuk UI admin (centang halaman per user). */
export const ASSIGNABLE_NAV_MODULES = PORTAL_NAV_MODULES;

/** Route lama — tidak tampil di sidebar; dipakai agar middleware bisa menolak akses langsung via URL. */
const RETIRED_PORTAL_ROUTES: { module: AppModule; href: string }[] = [
  { module: "nkb", href: "/nkb" },
  { module: "surat_jalan", href: "/surat-jalan" },
  { module: "purchase_orders", href: "/purchase-orders" },
  { module: "goods_receiving", href: "/goods-receiving" },
  { module: "discrepancies", href: "/discrepancies" },
  { module: "master_prices", href: "/master-prices" },
  { module: "invoices", href: "/invoices" },
  { module: "accounts_payable", href: "/accounts-payable" },
  { module: "suppliers", href: "/suppliers" },
  { module: "reports", href: "/reports" },
  { module: "notifications", href: "/notifications" },
  { module: "audit_logs", href: "/audit-logs" },
  { module: "integrations", href: "/integrations" },
  { module: "settings", href: "/settings" },
];

const ROUTE_CATALOG = [...PORTAL_NAV_MODULES, ...RETIRED_PORTAL_ROUTES];

export function isActivePortalModule(mod: AppModule): boolean {
  return PORTAL_NAV_MODULES.some((p) => p.module === mod);
}

export function pathnameToModule(pathname: string): AppModule | null {
  const entry = ROUTE_CATALOG.find(
    (n) => pathname === n.href || pathname.startsWith(`${n.href}/`)
  );
  return entry?.module ?? null;
}

export function parseAllowedModulesCell(raw: string | undefined | null): AppModule[] {
  const text = String(raw ?? "").trim();
  if (!text) return [];
  const valid = new Set(PORTAL_NAV_MODULES.map((m) => m.module));
  return text
    .split(/[;|,]/)
    .map((s) => s.trim().toLowerCase() as AppModule)
    .filter((m) => valid.has(m));
}

export function formatAllowedModulesCell(modules: AppModule[]): string {
  const valid = new Set(PORTAL_NAV_MODULES.map((m) => m.module));
  return [...new Set(modules)].filter((m) => valid.has(m)).join(";");
}
