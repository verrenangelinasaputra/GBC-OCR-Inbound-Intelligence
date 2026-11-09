import { timingSafeEqual } from "node:crypto";
import { createSessionToken, setSessionCookie } from "@/lib/auth/session";
import { normalizeUsername } from "./fields";
import { SupplierAuthError } from "./errors";

export const SUPPLIER_MASTER_ROLE = "SUPPLIER_MASTER_ADMIN" as const;

const DEFAULT_MASTER_PASSWORD = "admin_supplier@1";

export function supplierMasterUsername(): string {
  return (process.env.SUPPLIER_MASTER_USERNAME || "admin_supplier").trim().toLowerCase();
}

export function supplierMasterPasswordExpected(): string {
  return process.env.SUPPLIER_MASTER_PASSWORD?.trim() || DEFAULT_MASTER_PASSWORD;
}

export function isSupplierMasterUsername(raw: string): boolean {
  return normalizeUsername(raw) === supplierMasterUsername();
}

function verifyMasterPasswordPlain(input: string): boolean {
  const expected = supplierMasterPasswordExpected();
  const a = Buffer.from(input, "utf8");
  const b = Buffer.from(expected, "utf8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function loginSupplierMaster(password: string): Promise<{ redirect: string }> {
  if (!verifyMasterPasswordPlain(password)) {
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
