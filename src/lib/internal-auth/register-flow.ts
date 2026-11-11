import { randomUUID } from "node:crypto";
import { hashPassword } from "@/lib/auth/password";
import { getWarehouseCredentialsSpreadsheetId } from "@/lib/config/credentials-sheet";
import { getInternalUsersTab } from "@/lib/config/internal-sheet";
import { normalizeGudangSelection } from "@/lib/config/supplier-gudang";
import { generateVerificationCode } from "@/lib/supplier-auth/code";
import { SupplierAuthError } from "@/lib/supplier-auth/errors";
import {
  maskEmail,
  validateEmail,
  validatePasswordPair,
  validateUsername,
} from "@/lib/supplier-auth/fields";
import { adminNotifyEmail, sendMail, verificationEmailText } from "@/lib/supplier-auth/mail";
import {
  assertInternalCodeResendAllowed,
  consumeInternalAuthCode,
  saveInternalAuthCode,
  type InternalRegisterPayload,
} from "./codes";
import { appendInternalUser, findInternalUserByUsername } from "./directory";

function asError(error: unknown): SupplierAuthError {
  if (error instanceof SupplierAuthError) return error;
  const message = error instanceof Error ? error.message : "Permintaan gagal.";
  return new SupplierAuthError(message, /spreadsheet|SMTP|SESSION/i.test(message) ? 500 : 400);
}

function validateGudang(raw: unknown): string {
  try {
    return normalizeGudangSelection(raw);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Pilih gudang tujuan yang valid.";
    throw new SupplierAuthError(message);
  }
}

export async function sendInternalRegisterCode(body: {
  fullName?: string;
  username?: string;
  email?: string;
  phone?: string;
  gudang?: string | string[];
  password?: string;
  confirmPassword?: string;
}): Promise<{ maskedEmail: string; devHint?: string }> {
  try {
    const fullName = String(body.fullName ?? "").trim();
    const username = validateUsername(String(body.username ?? ""));
    const email = validateEmail(String(body.email ?? ""));
    const phone = String(body.phone ?? "").trim();
    const gudang = validateGudang(body.gudang);
    const password = String(body.password ?? "");
    if (fullName.length < 2 || fullName.length > 120) {
      throw new SupplierAuthError("Nama wajib diisi (2–120 karakter).");
    }
    if (phone.length < 8) throw new SupplierAuthError("Nomor telepon wajib diisi.");
    validatePasswordPair(password, String(body.confirmPassword ?? ""));

    const existing = await findInternalUserByUsername(username);
    if (existing) throw new SupplierAuthError("Username sudah dipakai. Login atau gunakan username lain.", 409);

    await assertInternalCodeResendAllowed(username);

    const code = generateVerificationCode();
    const payload: InternalRegisterPayload = {
      fullName,
      email,
      phone,
      gudang,
      passwordHash: await hashPassword(password),
    };
    await saveInternalAuthCode({ username, code, payload });

    try {
      const sent = await sendMail({
        to: email,
        subject: "Kode verifikasi pendaftaran Warehouse Intelligence GBC",
        text: verificationEmailText("register", code, username),
      });
      return {
        maskedEmail: maskEmail(email),
        devHint: sent.dev ? "Cek console server untuk kode (MAIL_DEV_LOG)." : undefined,
      };
    } catch (error) {
      await consumeInternalAuthCode(username, code).catch(() => null);
      throw error;
    }
  } catch (error) {
    throw asError(error);
  }
}

export async function verifyInternalRegisterCode(
  usernameRaw: string,
  codeRaw: string
): Promise<{ message: string; savedTo: { spreadsheetId: string; tab: string } }> {
  const username = validateUsername(usernameRaw);
  const code = codeRaw.replace(/\D/g, "");
  if (code.length !== 6) throw new SupplierAuthError("Kode harus 6 digit.");
  const payload = await consumeInternalAuthCode(username, code);
  if (!payload?.passwordHash) {
    throw new SupplierAuthError("Kode verifikasi salah atau kedaluwarsa.");
  }

  const existing = await findInternalUserByUsername(username);
  if (existing) throw new SupplierAuthError("Username sudah terdaftar.", 409);

  await appendInternalUser({
    userId: randomUUID(),
    fullName: payload.fullName,
    username,
    email: payload.email,
    phone: payload.phone,
    gudang: payload.gudang,
    passwordHash: payload.passwordHash,
    roles: ["WAREHOUSE_OPERATOR"],
  });

  try {
    await sendMail({
      to: adminNotifyEmail(),
      subject: "[GBC Warehouse] Akun gudang baru terdaftar",
      text: [
        `Nama: ${payload.fullName}`,
        `Username: ${username}`,
        `Email: ${payload.email}`,
        `Telepon: ${payload.phone}`,
        `Gudang: ${payload.gudang}`,
      ].join("\n"),
    });
  } catch {
    /* notifikasi admin opsional */
  }

  return {
    message:
      "Pendaftaran berhasil. Akun menunggu persetujuan Super Admin — Anda baru bisa login setelah disetujui.",
    savedTo: {
      spreadsheetId: getWarehouseCredentialsSpreadsheetId(),
      tab: getInternalUsersTab(),
    },
  };
}
