import { google } from "googleapis";
import { getInternalSheetId, getInternalUsersTab } from "@/lib/config/internal-sheet";
import { replaceSheetRows, SHEET_QUOTA_USER_MESSAGE, sheetQuotaError } from "@/lib/google-sheets/sheet-values";
import { isTabSetupCached, markTabSetupCached, tabSetupCacheKey } from "@/lib/google-sheets/tab-setup-cache";
import { loadServiceAccountCredentials } from "@/lib/providers/google-workspace/config";
import { SupplierAuthError } from "@/lib/supplier-auth/errors";
import type { AppModule } from "@/lib/rbac/modules";
import { formatAllowedModulesCell, parseAllowedModulesCell } from "@/lib/rbac/nav-modules";

export const INTERNAL_USER_HEADERS = [
  "user_id",
  "full_name",
  "username",
  "email",
  "phone",
  "gudang_tujuan",
  "password_hash",
  "roles",
  "status",
  "created_at",
  "last_login_at",
  "allowed_modules",
] as const;

export type InternalAccount = {
  rowNumber: number;
  userId: string;
  fullName: string;
  username: string;
  email: string;
  phone: string;
  gudang: string;
  passwordHash: string;
  roles: string[];
  status: string;
  allowedModules: AppModule[];
  createdAt: string;
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

async function resolveUsersTabGridId(
  sheets: ReturnType<typeof google.sheets>,
  spreadsheetId: string,
  tabTitle: string
): Promise<number> {
  const meta = await sheets.spreadsheets.get({
    spreadsheetId,
    fields: "sheets.properties",
  });
  const sheet = meta.data.sheets?.find((s) => s.properties?.title === tabTitle);
  const gridId = sheet?.properties?.sheetId;
  if (gridId == null) {
    throw new SupplierAuthError(`Tab "${tabTitle}" tidak ditemukan di spreadsheet internal.`, 500);
  }
  return gridId;
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
  if (sheetQuotaError(message)) {
    throw new SupplierAuthError(SHEET_QUOTA_USER_MESSAGE, 429);
  }
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

function isLegacyInternalHeader(headerRow: string[] | undefined): boolean {
  const h = (headerRow ?? []).map((c) => String(c ?? "").trim().toLowerCase());
  return h[0] === "user_id" && h[4] === "password_hash";
}

function isModernInternalHeader(headerRow: string[] | undefined): boolean {
  const h = (headerRow ?? []).map((c) => String(c ?? "").trim().toLowerCase());
  return h[0] === "user_id" && h[4] === "phone";
}

/** Header lama 9 kolom (password di E) → format baru 11 kolom agar append register tidak salah kolom. */
async function migrateLegacyInternalUsersTab(): Promise<void> {
  const { sheets, sheetId, tab } = sheetTarget();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: a1(tab, "A:Z"),
  });
  const rows = res.data.values ?? [];
  const next: string[][] = [Array.from(INTERNAL_USER_HEADERS)];
  for (let index = 1; index < rows.length; index += 1) {
    const r = rows[index] ?? [];
    const userId = String(r[0] ?? "").trim();
    if (!userId) continue;
    next.push([
      userId,
      r[1] ?? "",
      r[2] ?? "",
      r[3] ?? "",
      "",
      "",
      r[4] ?? "",
      r[5] ?? "WAREHOUSE_OPERATOR",
      r[6] ?? "ACTIVE",
      r[7] ?? "",
      r[8] ?? "",
      "",
    ]);
  }
  await replaceSheetRows(sheets, sheetId, tab, next, "L", rows.length);
}

async function ensureHeaders(): Promise<void> {
  const { sheets, sheetId, tab } = sheetTarget();
  const cacheKey = tabSetupCacheKey(sheetId, tab, "users-header");
  if (isTabSetupCached(cacheKey)) return;
  try {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: a1(tab, "A1:L1"),
    });
    const headerRow = res.data.values?.[0];
    const first = String(headerRow?.[0] ?? "").trim().toLowerCase();
    if (first === "user_id") {
      if (isLegacyInternalHeader(headerRow)) {
        await migrateLegacyInternalUsersTab();
      } else if (!isModernInternalHeader(headerRow)) {
        throw new SupplierAuthError(
          "Header tab warehouse tidak dikenali. Kosongkan baris 1 atau gunakan format user_id + phone di kolom E.",
          500
        );
      }
      if (String(headerRow?.[11] ?? "").trim().toLowerCase() !== "allowed_modules") {
        await sheets.spreadsheets.values.update({
          spreadsheetId: sheetId,
          range: a1(tab, "L1"),
          valueInputOption: "RAW",
          requestBody: { values: [["allowed_modules"]] },
        });
      }
      markTabSetupCached(cacheKey);
      return;
    }
    if (first) {
      throw new SupplierAuthError(
        "Baris 1 spreadsheet internal harus kosong atau header user_id.",
        500
      );
    }
    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: a1(tab, "A1:L1"),
      valueInputOption: "RAW",
      requestBody: { values: [Array.from(INTERNAL_USER_HEADERS)] },
    });
    markTabSetupCached(cacheKey);
  } catch (error) {
    wrapSheetError(error);
  }
}

function accountFromRow(row: string[], rowNumber: number): InternalAccount {
  const legacy = String(row[4] ?? "").startsWith("$") || String(row[4] ?? "").length > 40;
  return {
    rowNumber,
    userId: row[0] ?? "",
    fullName: row[1] ?? "",
    username: String(row[2] ?? "").trim().toLowerCase(),
    email: String(row[3] ?? "").trim().toLowerCase(),
    phone: legacy ? "" : String(row[4] ?? ""),
    gudang: legacy ? "" : String(row[5] ?? ""),
    passwordHash: legacy ? (row[4] ?? "") : (row[6] ?? ""),
    roles: parseRoles(legacy ? (row[5] ?? "WAREHOUSE_OPERATOR") : (row[7] ?? "WAREHOUSE_OPERATOR")),
    status: String(legacy ? row[6] : row[8] ?? "ACTIVE")
      .trim()
      .toUpperCase() || "ACTIVE",
    allowedModules: legacy ? [] : parseAllowedModulesCell(row[11]),
    createdAt: legacy ? "" : String(row[9] ?? ""),
  };
}

export async function findInternalUserByUsername(username: string): Promise<InternalAccount | null> {
  const { sheets, sheetId, tab } = sheetTarget();
  const key = username.trim().toLowerCase();
  try {
    await ensureHeaders();
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: a1(tab, "A:L"),
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

export async function listInternalUsers(): Promise<InternalAccount[]> {
  const { sheets, sheetId, tab } = sheetTarget();
  try {
    await ensureHeaders();
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: a1(tab, "A:L"),
    });
    const rows = res.data.values ?? [];
    const accounts: InternalAccount[] = [];
    for (let index = 1; index < rows.length; index += 1) {
      const userId = String(rows[index]?.[0] ?? "").trim();
      if (!userId) continue;
      accounts.push(accountFromRow(rows[index] ?? [], index + 1));
    }
    return accounts;
  } catch (error) {
    wrapSheetError(error);
  }
}

export type InternalUserAdminPatch = {
  status?: string;
  gudang?: string;
  roles?: string[];
  allowedModules?: AppModule[];
};

export async function updateInternalUserAdmin(
  username: string,
  patch: InternalUserAdminPatch
): Promise<InternalAccount> {
  const account = await findInternalUserByUsername(username);
  if (!account) throw new SupplierAuthError("User tidak ditemukan.", 404);

  const { sheets, sheetId, tab } = sheetTarget();
  const status = (patch.status ?? account.status).trim().toUpperCase();
  const gudang = patch.gudang !== undefined ? patch.gudang : account.gudang;
  const roles = patch.roles ?? account.roles;
  const allowedModules = patch.allowedModules ?? account.allowedModules;

  const row = [
    account.userId,
    account.fullName,
    account.username,
    account.email,
    account.phone,
    gudang,
    account.passwordHash,
    roles.join(","),
    status,
    account.createdAt,
    "",
    formatAllowedModulesCell(allowedModules),
  ];

  try {
    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: a1(tab, `A${account.rowNumber}:L${account.rowNumber}`),
      valueInputOption: "RAW",
      requestBody: { values: [row] },
    });
  } catch (error) {
    wrapSheetError(error);
  }

  const updated = await findInternalUserByUsername(username);
  if (!updated) throw new SupplierAuthError("Gagal membaca user setelah update.", 500);
  return updated;
}

/** Username bisa dipakai register baru jika belum ada atau status ditolak (daftar ulang). */
export function internalUsernameOpenForRegistration(account: InternalAccount | null): boolean {
  if (!account) return true;
  return account.status === "REJECTED";
}

export async function replaceRejectedInternalRegistration(params: {
  username: string;
  fullName: string;
  email: string;
  phone: string;
  gudang: string;
  passwordHash: string;
}): Promise<void> {
  const account = await findInternalUserByUsername(params.username);
  if (!account || account.status !== "REJECTED") {
    throw new SupplierAuthError("Username tidak bisa didaftarkan ulang.", 409);
  }

  const { sheets, sheetId, tab } = sheetTarget();
  const row = [
    account.userId,
    params.fullName.trim(),
    account.username,
    params.email.trim().toLowerCase(),
    params.phone.trim(),
    params.gudang,
    params.passwordHash,
    "WAREHOUSE_OPERATOR",
    "PENDING_APPROVAL",
    timestampJakarta(),
    "",
    "",
  ];

  try {
    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: a1(tab, `A${account.rowNumber}:L${account.rowNumber}`),
      valueInputOption: "RAW",
      requestBody: { values: [row] },
    });
  } catch (error) {
    wrapSheetError(error);
  }
}

export async function deleteInternalUser(username: string, actorUsername?: string): Promise<void> {
  const key = username.trim().toLowerCase();
  const account = await findInternalUserByUsername(key);
  if (!account) throw new SupplierAuthError("User tidak ditemukan.", 404);

  const actor = actorUsername?.trim().toLowerCase();
  if (actor && actor === account.username) {
    throw new SupplierAuthError("Anda tidak bisa menghapus akun yang sedang dipakai login.", 400);
  }

  if (account.roles.includes("SUPER_ADMIN")) {
    const all = await listInternalUsers();
    const otherSupers = all.filter(
      (u) => u.roles.includes("SUPER_ADMIN") && u.username !== account.username
    );
    if (otherSupers.length === 0) {
      throw new SupplierAuthError("Tidak bisa menghapus satu-satunya Super Admin.", 400);
    }
  }

  const { sheets, sheetId, tab } = sheetTarget();
  const gridId = await resolveUsersTabGridId(sheets, sheetId, tab);
  try {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: sheetId,
      requestBody: {
        requests: [
          {
            deleteDimension: {
              range: {
                sheetId: gridId,
                dimension: "ROWS",
                startIndex: account.rowNumber - 1,
                endIndex: account.rowNumber,
              },
            },
          },
        ],
      },
    });
  } catch (error) {
    wrapSheetError(error);
  }
}

export async function markInternalLogin(rowNumber: number): Promise<void> {
  const { sheets, sheetId, tab } = sheetTarget();
  try {
    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: a1(tab, `K${rowNumber}`),
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
  phone?: string;
  gudang?: string;
  passwordHash: string;
  roles: string[];
}): Promise<void> {
  const { sheets, sheetId, tab } = sheetTarget();
  const now = timestampJakarta();
  try {
    await ensureHeaders();
    await sheets.spreadsheets.values.append({
      spreadsheetId: sheetId,
      range: a1(tab, "A:L"),
      valueInputOption: "RAW",
      insertDataOption: "INSERT_ROWS",
      requestBody: {
        values: [
          [
            row.userId,
            row.fullName,
            row.username,
            row.email,
            row.phone ?? "",
            row.gudang ?? "",
            row.passwordHash,
            row.roles.join(","),
            "PENDING_APPROVAL",
            now,
            "",
            "",
          ],
        ],
      },
    });
  } catch (error) {
    wrapSheetError(error);
  }
}
