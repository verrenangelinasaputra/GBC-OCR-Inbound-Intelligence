import { createSessionToken, setSessionCookie } from "@/lib/auth/session";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { isSupplierMasterUsername, loginSupplierMaster } from "./master-admin";
import { generateVerificationCode } from "./code";
import {
  assertCodeResendAllowed,
  consumeAuthCode,
  createSupplierAccount,
  findSupplierByUsername,
  markSupplierLogin,
  saveAuthCode,
  updateSupplierPassword,
} from "./directory";
import { SupplierAuthError } from "./errors";
import { maskEmail, validateEmail, validatePasswordPair, validateUsername } from "./fields";
import { adminNotifyEmail, newSupplierNotifyText, sendMail, verificationEmailText } from "./mail";

function asError(error: unknown): SupplierAuthError {
  if (error instanceof SupplierAuthError) return error;
  const message = error instanceof Error ? error.message : "Permintaan gagal.";
  const status = /SESSION_SECRET|spreadsheet|service account|Email belum|SMTP/i.test(message) ? 500 : 400;
  return new SupplierAuthError(message, status);
}

export async function sendRegisterCode(body: {
  supplierName?: string;
  contactName?: string;
  username?: string;
  email?: string;
  phone?: string;
  password?: string;
  confirmPassword?: string;
}): Promise<{ maskedEmail: string; devHint?: string }> {
  try {
    const supplierName = String(body.supplierName ?? "").trim();
    const contactName = String(body.contactName ?? "").trim();
    const username = validateUsername(String(body.username ?? ""));
    const email = validateEmail(String(body.email ?? ""));
    const phone = String(body.phone ?? "").trim();
    const password = String(body.password ?? "");
    if (supplierName.length < 2 || supplierName.length > 120) {
      throw new SupplierAuthError("Nama perusahaan wajib diisi (2–120 karakter).");
    }
    if (contactName.length < 2 || contactName.length > 120) {
      throw new SupplierAuthError("Nama kontak wajib diisi (2–120 karakter).");
    }
    if (phone.length < 8) throw new SupplierAuthError("Nomor telepon wajib diisi.");
    validatePasswordPair(password, String(body.confirmPassword ?? ""));

    const existing = await findSupplierByUsername(username);
    if (existing) throw new SupplierAuthError("Username sudah dipakai. Pilih yang lain atau login.", 409);
    await assertCodeResendAllowed(username, "register");

    const code = generateVerificationCode();
    const payload = {
      supplierName,
      contactName,
      email,
      phone,
      passwordHash: await hashPassword(password),
    };
    await saveAuthCode({ username, purpose: "register", code, payload });
    try {
      const sent = await sendMail({
        to: email,
        subject: "Kode verifikasi pendaftaran portal supplier GBC",
        text: verificationEmailText("register", code, username),
      });
      return {
        maskedEmail: maskEmail(email),
        devHint: sent.dev ? "Cek console server untuk kode (MAIL_DEV_LOG)." : undefined,
      };
    } catch (error) {
      await consumeAuthCode(username, "register", code).catch(() => null);
      throw error;
    }
  } catch (error) {
    throw asError(error);
  }
}

export async function verifyRegisterCode(usernameRaw: string, codeRaw: string): Promise<{ message: string }> {
  const username = validateUsername(usernameRaw);
  const code = codeRaw.replace(/\D/g, "");
  if (code.length !== 6) throw new SupplierAuthError("Kode harus 6 digit.");
  const payload = await consumeAuthCode(username, "register", code);
  if (!payload?.passwordHash) throw new SupplierAuthError("Kode verifikasi salah atau kedaluwarsa.");
  await createSupplierAccount({ ...payload, username });
  try {
    await sendMail({
      to: adminNotifyEmail(),
      subject: "[GBC Supplier] Akun baru terdaftar",
      text: newSupplierNotifyText({
        supplierName: payload.supplierName,
        contactName: payload.contactName,
        username,
        email: payload.email,
        phone: payload.phone,
      }),
    });
  } catch (error) {
    console.error("[supplier.register.notify]", error instanceof Error ? error.message : error);
  }
  return { message: "Pendaftaran berhasil. Silakan login." };
}

export async function loginSupplier(usernameRaw: string, password: string): Promise<{ redirect: string }> {
  const username = validateUsername(usernameRaw);
  if (isSupplierMasterUsername(username)) {
    return loginSupplierMaster(password);
  }
  const account = await findSupplierByUsername(username);
  const ok = account?.emailVerified && (await verifyPassword(password, account.passwordHash));
  if (!account || !ok) throw new SupplierAuthError("Username atau password salah.", 401);
  if (account.status !== "ACTIVE") throw new SupplierAuthError("Akun dinonaktifkan. Hubungi tim GBC.", 403);
  await markSupplierLogin(account.rowNumber);
  const token = await createSessionToken({
    userId: account.userId || `supplier:${account.username}`,
    username: account.username,
    roles: ["SUPPLIER_USER"],
    supplierId: null,
  });
  await setSessionCookie(token);
  return { redirect: "/supplier" };
}

export async function sendPasswordResetCode(usernameRaw: string): Promise<{ message: string; devHint?: string }> {
  const username = validateUsername(usernameRaw);
  await assertCodeResendAllowed(username, "reset_password");
  const account = await findSupplierByUsername(username);
  const generic = "Jika username terdaftar, kode verifikasi telah dikirim ke email pada akun tersebut.";
  if (!account?.emailVerified || account.status !== "ACTIVE") {
    return { message: generic };
  }
  const code = generateVerificationCode();
  await saveAuthCode({ username, purpose: "reset_password", code });
  try {
    const sent = await sendMail({
      to: account.email,
      subject: "Kode reset password portal supplier GBC",
      text: verificationEmailText("reset_password", code, username),
    });
    return { message: generic, devHint: sent.dev ? "Cek console server untuk kode (MAIL_DEV_LOG)." : undefined };
  } catch (error) {
    await consumeAuthCode(username, "reset_password", code).catch(() => null);
    throw asError(error);
  }
}

export async function resetSupplierPassword(body: {
  username?: string;
  code?: string;
  password?: string;
  confirmPassword?: string;
}): Promise<{ message: string }> {
  const username = validateUsername(String(body.username ?? ""));
  const code = String(body.code ?? "").replace(/\D/g, "");
  const password = String(body.password ?? "");
  if (code.length !== 6) throw new SupplierAuthError("Kode harus 6 digit.");
  validatePasswordPair(password, String(body.confirmPassword ?? ""));
  const ok = await consumeAuthCode(username, "reset_password", code);
  if (!ok) throw new SupplierAuthError("Kode verifikasi salah atau kedaluwarsa.");
  await updateSupplierPassword(username, await hashPassword(password));
  return { message: "Password diperbarui. Silakan login." };
}
