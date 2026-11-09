import { createSessionToken, setSessionCookie } from "@/lib/auth/session";
import { verifyPassword } from "@/lib/auth/password";
import { normalizeUsername } from "./fields";
import { SupplierAuthError } from "./errors";

export const SUPPLIER_MASTER_ROLE = "SUPPLIER_MASTER_ADMIN" as const;

export function supplierMasterUsername(): string {
  return (process.env.SUPPLIER_MASTER_USERNAME || "admin_supplier").trim().toLowerCase();
}

export function isSupplierMasterUsername(raw: string): boolean {
  return normalizeUsername(raw) === supplierMasterUsername();
}

export async function loginSupplierMaster(password: string): Promise<{ redirect: string }> {
  const hash = process.env.SUPPLIER_MASTER_PASSWORD_HASH?.trim();
  if (!hash) {
    throw new SupplierAuthError(
      "Master supplier belum dikonfigurasi. Set SUPPLIER_MASTER_PASSWORD_HASH (npm run supplier:master-setup).",
      500
    );
  }
  if (!(await verifyPassword(password, hash))) {
    throw new SupplierAuthError("Username atau password salah.", 401);
  }
  const username = supplierMasterUsername();
  const token = await createSessionToken({
    userId: `supplier-master:${username}`,
    username,
    roles: [SUPPLIER_MASTER_ROLE],
    supplierId: null,
  });
  await setSessionCookie(token);
  return { redirect: "/supplier/master" };
}
