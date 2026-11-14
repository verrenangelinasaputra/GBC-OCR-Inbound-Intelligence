import "server-only";

import { findSupplierByUsername } from "@/lib/supplier-auth/directory";
import { SupplierAuthError } from "@/lib/supplier-auth/errors";
import { resolveSupplierUploadMapping } from "@/lib/services/supplier-upload-mapping";

export const SUPPLIER_MAPPING_PENDING_MESSAGE =
  "Akun menunggu verifikasi mapping supplier oleh tim GBC. Minta admin mencocokkan nama perusahaan Anda di Mapping Data Supplier sebelum login.";

export async function isSupplierMappingApproved(params: {
  supplierName?: string;
  supplierUsername?: string;
}): Promise<boolean> {
  const name = params.supplierName?.trim() ?? "";
  const user = params.supplierUsername?.trim() ?? "";
  if (!name && !user) return false;
  const mapping = await resolveSupplierUploadMapping({
    supplierName: name || undefined,
    supplierUsername: user || undefined,
  });
  return mapping !== null;
}

export async function requireSupplierMappingApproved(username: string): Promise<void> {
  const account = await findSupplierByUsername(username);
  if (!account) {
    throw new SupplierAuthError("Akun tidak ditemukan.", 404);
  }
  const ok = await isSupplierMappingApproved({
    supplierName: account.supplierName,
    supplierUsername: account.username,
  });
  if (!ok) {
    throw new SupplierAuthError(SUPPLIER_MAPPING_PENDING_MESSAGE, 403);
  }
}

/** Portal supplier — SUPPLIER_USER wajib mapping; role lain dilewati. */
export async function enforceSupplierMappingIfUser(session: {
  username: string;
  roles: string[];
}): Promise<void> {
  if (!session.roles.includes("SUPPLIER_USER")) return;
  await requireSupplierMappingApproved(session.username);
}