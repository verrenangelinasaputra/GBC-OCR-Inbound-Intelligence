import { verifyPassword } from "@/lib/auth/password";
import { portalModulesFromCells } from "@/lib/rbac/portal-module-access";
import { SupplierAuthError } from "@/lib/supplier-auth/errors";
import { findInternalUserByUsername, markInternalLogin } from "./directory";

export async function loginInternalFromSheet(usernameRaw: string, password: string) {
  const username = usernameRaw.trim().toLowerCase();
  if (!username || !password) {
    throw new SupplierAuthError("Username dan password wajib diisi.");
  }

  const account = await findInternalUserByUsername(username);
  if (!account) {
    throw new SupplierAuthError("Username atau password salah.", 401);
  }
  if (account.status === "PENDING_APPROVAL") {
    throw new SupplierAuthError(
      "Akun menunggu persetujuan Super Admin. Anda akan bisa login setelah disetujui.",
      403
    );
  }
  if (account.status === "REJECTED") {
    throw new SupplierAuthError(
      "Pendaftaran ditolak. Daftar ulang di halaman Register dengan username yang sama setelah memperbarui data.",
      403
    );
  }
  if (account.status !== "ACTIVE") {
    throw new SupplierAuthError("Akun tidak aktif. Hubungi administrator GBC.", 403);
  }

  const ok = await verifyPassword(password, account.passwordHash);
  if (!ok) {
    throw new SupplierAuthError("Username atau password salah.", 401);
  }

  const roles = account.roles.length ? account.roles : ["SUPER_ADMIN"];
  await markInternalLogin(account.rowNumber);

  const access = portalModulesFromCells({
    legacy: account.allowedModules,
    gudang: account.allowedModulesGudang,
    customer: account.allowedModulesCustomer,
  });

  return {
    userId: account.userId || `internal:${account.username}`,
    username: account.username,
    fullName: account.fullName,
    roles,
    allowedModules: access.union,
    allowedModulesGudang: access.gudang,
    allowedModulesCustomer: access.customer,
  };
}
