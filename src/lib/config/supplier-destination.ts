import {
  SUPPLIER_CUSTOMER_DESTINATION,
  SUPPLIER_GUDANG_WAREHOUSE_OPTIONS,
  type SupplierGudangWarehouse,
} from "@/lib/config/supplier-gudang";

export { SUPPLIER_CUSTOMER_DESTINATION };

export function isCustomerDestination(gudang: string): boolean {
  return gudang.trim() === SUPPLIER_CUSTOMER_DESTINATION;
}

export function validateSupplierGudangSelection(gudang: string, customerName?: string): void {
  const g = gudang.trim();
  if (!g) throw new Error("Pilih gudang tujuan.");
  if (isCustomerDestination(g)) {
    const name = String(customerName ?? "").trim();
    if (!name) throw new Error("Nama customer wajib diisi.");
    if (name.length > 120) throw new Error("Nama customer terlalu panjang (maks. 120 karakter).");
    return;
  }
  if (!SUPPLIER_GUDANG_WAREHOUSE_OPTIONS.includes(g as SupplierGudangWarehouse)) {
    throw new Error("Pilih gudang tujuan yang valid.");
  }
}

export function sanitizeCustomerFolderName(name: string): string {
  return name
    .trim()
    .replace(/[\\/:*?"<>|]/g, " ")
    .replace(/\s+/g, " ")
    .slice(0, 120);
}