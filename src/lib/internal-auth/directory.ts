import { google } from "googleapis";
import { getInternalSheetId, getInternalUsersTab } from "@/lib/config/internal-sheet";
import { loadServiceAccountCredentials } from "@/lib/providers/google-workspace/config";
import { SupplierAuthError } from "@/lib/supplier-auth/errors";

export const INTERNAL_USER_HEADERS = [
  "user_id",
  "full_name",
  "username",
  "email",
  "password_hash",
  "roles",
  "status",
  "created_at",
  "last_login_at",
] as const;

export type InternalAccount = {
  rowNumber: number;
  userId: string;
  fullName: string;
  username: string;
  email: string;
  passwordHash: string;
  roles: string[];
  status: string;
};

function sheetTarget() {
  const creds = loadServiceAccountCredentials();
  if (!creds) {
    throw new SupplierAuthError(
      "Service account Google belum diatur. Isi GOOGLE_SERVICE_ACCOUNT_JSON di Vercel.",
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
    sheetId: getInternalSheetId(),
    tab: getInternalUsersTab(),
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
      "Spreadsheet internal tidak bisa diakses. Share sebagai Editor ke email service account (Users / akun admin).",
      500
    );
  }
  throw new SupplierAuthError(message || "Gagal membaca spreadsheet internal.", 500);
}

function parseRoles(raw: string): string[] {
  return raw
    .split(/[,;|]/)
    .map((r) => r.trim().toUpperCase())
    .filter(Boolean);
}

async function ensureHeaders(): Promise<void> {
  const { sheets, sheetId, tab } = sheetTarget();
  try {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: a1(tab, "A1:I1"),
    });
    const first = String(res.data.values?.[0]?.[0] ?? "").trim().toLowerCase();
    if (first === "user_id") return;
    if (first) {
      throw new SupplierAuthError(
        "Baris 1 spreadsheet internal harus kosong atau header user_id.",
        500
      );
    }
    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: a1(tab, "A1:I1"),
      valueInputOption: "RAW",
      requestBody: { values: [Array.from(INTERNAL_USER_HEADERS)] },
    });
  } catch (error) {
    wrapSheetError(error);
  }
}

function accountFromRow(row: string[], rowNumber: number): InternalAccount {
  return {
    rowNumber,
    userId: row[0] ?? "",
    fullName: row[1] ?? "",
    username: String(row[2] ?? "").trim().toLowerCase(),
    email: String(row[3] ?? "").trim().toLowerCase(),
    passwordHash: row[4] ?? "",
    roles: parseRoles(row[5] ?? "SUPER_ADMIN"),
    status: String(row[6] ?? "ACTIVE").trim().toUpperCase() || "ACTIVE",
  };
}

export async function findInternalUserByUsername(username: string): Promise<InternalAccount | null> {
  const { sheets, sheetId, tab } = sheetTarget();
  const key = username.trim().toLowerCase();
  try {
    await ensureHeaders();
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: a1(tab, "A:I"),
    });
    const rows = res.data.values ?? [];
    for (let index = 1; index < rows.length; index += 1) {
      const account = accountFromRow(rows[index] ?? [], index + 1);
      if (account.username === key) return account;
    }
    return null;
  } catch (error) {
    wrapSheetError(error);
  }
}

export async function markInternalLogin(rowNumber: number): Promise<void> {
  const { sheets, sheetId, tab } = sheetTarget();
  try {
    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: a1(tab, `I${rowNumber}`),
      valueInputOption: "RAW",
      requestBody: { values: [[timestampJakarta()]] },
    });
  } catch (error) {
    wrapSheetError(error);
  }
}

export async function appendInternalUser(row: {
  userId: string;
  fullName: string;
  username: string;
  email: string;
  passwordHash: string;
  roles: string[];
}): Promise<void> {
  const { sheets, sheetId, tab } = sheetTarget();
  const now = timestampJakarta();
  try {
    await ensureHeaders();
    await sheets.spreadsheets.values.append({
      spreadsheetId: sheetId,
      range: a1(tab, "A:I"),
      valueInputOption: "RAW",
      insertDataOption: "INSERT_ROWS",
      requestBody: {
        values: [[
          row.userId,
          row.fullName,
          row.username,
          row.email,
          row.passwordHash,
          row.roles.join(","),
          "ACTIVE",
          now,
          "",
        ]],
      },
    });
  } catch (error) {
    wrapSheetError(error);
  }
}
