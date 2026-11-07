import { randomUUID } from "node:crypto";
import { google } from "googleapis";
import { loadServiceAccountCredentials } from "@/lib/providers/google-workspace/config";
import { hashVerificationCode, verificationCodeMatches } from "./code";
import { SupplierAuthError } from "./errors";

const DEFAULT_SHEET_ID = "156m4HFAUnqubtCJumBJZ9BCCel_kNVcU_ZV9kHi4HtY";
const USERS_TAB = () => process.env.SUPPLIER_USERS_TAB?.trim() || "Users";
const CODES_TAB = () => process.env.SUPPLIER_AUTH_CODES_TAB?.trim() || "AuthCodes";

const USER_HEADERS = [
  "user_id",
  "supplier_name",
  "contact_name",
  "username",
  "email",
  "phone",
  "password_hash",
  "email_verified",
  "status",
  "created_at",
  "verified_at",
  "last_login_at",
] as const;

const CODE_HEADERS = ["username", "purpose", "code_hash", "expires_at", "created_at", "payload_json"] as const;

export type SupplierAccount = {
  rowNumber: number;
  userId: string;
  supplierName: string;
  contactName: string;
  username: string;
  email: string;
  phone: string;
  passwordHash: string;
  emailVerified: boolean;
  status: string;
};

export type RegisterPayload = {
  supplierName: string;
  contactName: string;
  email: string;
  phone: string;
  passwordHash: string;
};

type CodePurpose = "register" | "reset_password";

function sheetTarget() {
  const creds = loadServiceAccountCredentials();
  if (!creds) {
    throw new SupplierAuthError(
      "Service account Google belum diatur. Isi GOOGLE_SERVICE_ACCOUNT_JSON (atau file JSON lokal).",
      500
    );
  }
  const auth = new google.auth.JWT({
    email: creds.client_email,
    key: creds.private_key,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  return {
    sheets: google.sheets({ version: "v4", auth }),
    sheetId: process.env.SUPPLIER_SHEET_ID?.trim() || DEFAULT_SHEET_ID,
  };
}

function a1(tab: string, cells: string): string {
  return `'${tab.replace(/'/g, "''")}'!${cells}`;
}

function timestampJakarta(date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")} ${get("hour")}:${get("minute")}:${get("second")}`;
}

function wrapSheetError(error: unknown): never {
  if (error instanceof SupplierAuthError) throw error;
  const message = error instanceof Error ? error.message : String(error);
  if (/403|permission|not found|404|requested entity was not found/i.test(message)) {
    throw new SupplierAuthError(
      "Spreadsheet Supplier Credentials tidak bisa diakses. Share sebagai Editor ke email service account, dan ubah akses dari Anyone with the link menjadi Restricted.",
      500
    );
  }
  throw new SupplierAuthError(message || "Gagal membaca spreadsheet supplier.", 500);
}

async function ensureTab(tab: string, headers: readonly string[]): Promise<void> {
  const { sheets, sheetId } = sheetTarget();
  const meta = await sheets.spreadsheets.get({
    spreadsheetId: sheetId,
    fields: "sheets.properties.title",
  });
  const exists = meta.data.sheets?.some((sheet) => sheet.properties?.title === tab);
  if (!exists) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: sheetId,
      requestBody: { requests: [{ addSheet: { properties: { title: tab } } }] },
    });
  }
  const head = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: a1(tab, "1:1"),
  });
  const first = String(head.data.values?.[0]?.[0] ?? "").trim().toLowerCase();
  if (first === headers[0]) return;
  if (first) {
    throw new SupplierAuthError(
      `Baris 1 tab ${tab} harus kosong atau header ${headers[0]}.`,
      500
    );
  }
  await sheets.spreadsheets.values.update({
    spreadsheetId: sheetId,
    range: a1(tab, "A1"),
    valueInputOption: "RAW",
    requestBody: { values: [Array.from(headers)] },
  });
}

async function readTab(tab: string): Promise<string[][]> {
  const { sheets, sheetId } = sheetTarget();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: a1(tab, "A:Z"),
  });
  return (res.data.values ?? []).map((row) => row.map((cell) => String(cell ?? "")));
}

async function writeTab(tab: string, rows: string[][]): Promise<void> {
  const { sheets, sheetId } = sheetTarget();
  await sheets.spreadsheets.values.clear({ spreadsheetId: sheetId, range: a1(tab, "A:Z") });
  if (rows.length === 0) return;
  await sheets.spreadsheets.values.update({
    spreadsheetId: sheetId,
    range: a1(tab, "A1"),
    valueInputOption: "RAW",
    requestBody: { values: rows },
  });
}

function accountFromRow(row: string[], rowNumber: number): SupplierAccount {
  const status = String(row[8] ?? "ACTIVE").trim().toUpperCase() || "ACTIVE";
  return {
    rowNumber,
    userId: row[0] ?? "",
    supplierName: row[1] ?? "",
    contactName: row[2] ?? "",
    username: String(row[3] ?? "").trim().toLowerCase(),
    email: String(row[4] ?? "").trim().toLowerCase(),
    phone: row[5] ?? "",
    passwordHash: row[6] ?? "",
    emailVerified: String(row[7] ?? "").toLowerCase() === "true",
    status,
  };
}

export async function findSupplierByUsername(username: string): Promise<SupplierAccount | null> {
  try {
    await ensureTab(USERS_TAB(), USER_HEADERS);
    const rows = await readTab(USERS_TAB());
    const key = username.trim().toLowerCase();
    for (let index = 1; index < rows.length; index += 1) {
      const account = accountFromRow(rows[index] ?? [], index + 1);
      if (account.username === key) return account;
    }
    return null;
  } catch (error) {
    wrapSheetError(error);
  }
}

export async function createSupplierAccount(params: RegisterPayload & { username: string }): Promise<void> {
  const existing = await findSupplierByUsername(params.username);
  if (existing) throw new SupplierAuthError("Username sudah dipakai. Pilih yang lain atau login.", 409);
  const { sheets, sheetId } = sheetTarget();
  const now = timestampJakarta();
  try {
    await sheets.spreadsheets.values.append({
      spreadsheetId: sheetId,
      range: a1(USERS_TAB(), "A:L"),
      valueInputOption: "RAW",
      insertDataOption: "INSERT_ROWS",
      requestBody: {
        values: [[
          randomUUID(),
          params.supplierName,
          params.contactName,
          params.username,
          params.email,
          params.phone,
          params.passwordHash,
          "true",
          "ACTIVE",
          now,
          now,
          "",
        ]],
      },
    });
  } catch (error) {
    wrapSheetError(error);
  }
}

export async function markSupplierLogin(rowNumber: number): Promise<void> {
  const { sheets, sheetId } = sheetTarget();
  try {
    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: a1(USERS_TAB(), `L${rowNumber}`),
      valueInputOption: "RAW",
      requestBody: { values: [[timestampJakarta()]] },
    });
  } catch (error) {
    wrapSheetError(error);
  }
}

export async function updateSupplierPassword(username: string, passwordHash: string): Promise<void> {
  const account = await findSupplierByUsername(username);
  if (!account) throw new SupplierAuthError("Username tidak ditemukan.");
  const { sheets, sheetId } = sheetTarget();
  try {
    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: a1(USERS_TAB(), `G${account.rowNumber}`),
      valueInputOption: "RAW",
      requestBody: { values: [[passwordHash]] },
    });
  } catch (error) {
    wrapSheetError(error);
  }
}

async function loadCodeRows(): Promise<string[][]> {
  await ensureTab(CODES_TAB(), CODE_HEADERS);
  const rows = await readTab(CODES_TAB());
  if (rows.length === 0) return [Array.from(CODE_HEADERS)];
  return rows;
}

export async function assertCodeResendAllowed(username: string, purpose: CodePurpose): Promise<void> {
  try {
    const rows = await loadCodeRows();
    const now = Date.now();
    for (let index = 1; index < rows.length; index += 1) {
      const row = rows[index] ?? [];
      if (String(row[0]).toLowerCase() !== username || row[1] !== purpose) continue;
      const created = Date.parse(row[4] ?? "");
      if (Number.isFinite(created) && now - created < 60_000) {
        const wait = Math.ceil((60_000 - (now - created)) / 1000);
        throw new SupplierAuthError(`Tunggu ${wait} detik sebelum kirim ulang kode.`, 429);
      }
    }
  } catch (error) {
    wrapSheetError(error);
  }
}

export async function saveAuthCode(params: {
  username: string;
  purpose: CodePurpose;
  code: string;
  payload?: RegisterPayload;
}): Promise<void> {
  try {
    const rows = await loadCodeRows();
    const now = Date.now();
    const kept = [rows[0]?.length ? rows[0] : Array.from(CODE_HEADERS)];
    for (let index = 1; index < rows.length; index += 1) {
      const row = rows[index] ?? [];
      const expires = Date.parse(row[3] ?? "");
      const same = String(row[0]).toLowerCase() === params.username && row[1] === params.purpose;
      if (same || !Number.isFinite(expires) || expires < now) continue;
      kept.push(row);
    }
    const expiresAt = new Date(now + 15 * 60 * 1000).toISOString();
    kept.push([
      params.username,
      params.purpose,
      hashVerificationCode(params.code),
      expiresAt,
      new Date(now).toISOString(),
      params.payload ? JSON.stringify(params.payload) : "",
    ]);
    await writeTab(CODES_TAB(), kept);
  } catch (error) {
    wrapSheetError(error);
  }
}

export async function consumeAuthCode(
  username: string,
  purpose: CodePurpose,
  code: string
): Promise<RegisterPayload | null> {
  try {
    const rows = await loadCodeRows();
    const now = Date.now();
    let match = -1;
    for (let index = 1; index < rows.length; index += 1) {
      const row = rows[index] ?? [];
      if (String(row[0]).toLowerCase() !== username) continue;
      if (row[1] !== purpose) continue;
      if (!verificationCodeMatches(code, row[2] ?? "")) continue;
      const expires = Date.parse(row[3] ?? "");
      if (!Number.isFinite(expires) || expires < now) continue;
      match = index;
      break;
    }
    if (match < 0) return null;
    const payloadRaw = rows[match]?.[5] ?? "";
    const kept = rows.filter((_, index) => index !== match);
    await writeTab(CODES_TAB(), kept.length ? kept : [Array.from(CODE_HEADERS)]);
    if (!payloadRaw) return { supplierName: "", contactName: "", email: "", phone: "", passwordHash: "" };
    return JSON.parse(payloadRaw) as RegisterPayload;
  } catch (error) {
    wrapSheetError(error);
  }
}
