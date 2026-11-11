import type { AppModule } from "@/lib/rbac/modules";

/** Modul default saat Super Admin menyetujui user baru (bisa diubah per user). */
export const DEFAULT_APPROVED_USER_MODULES: AppModule[] = [
  "dashboard",
  "surat_jalan",
  "ocr_review",
  "sku_mapping",
  "data_barang_masuk",
  "notifications",
];
