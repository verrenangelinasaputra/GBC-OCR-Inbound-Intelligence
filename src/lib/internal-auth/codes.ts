import { google } from "googleapis";
import { getInternalSheetId } from "@/lib/config/internal-sheet";
import { loadServiceAccountCredentials } from "@/lib/providers/google-workspace/config";
import { hashVerificationCode, verificationCodeMatches } from "@/lib/supplier-auth/code";
import { SupplierAuthError } from "@/lib/supplier-auth/errors";

const CODES_TAB = () => process.env.INTERNAL_AUTH_CODES_TAB?.trim() || "AuthCodes";

const CODE_HEADERS = ["username", "purpose", "code_hash", "expires_at", "created_at", "payload_json"] as const;

export type InternalRegisterPayload = {
  fullName: string;
  email: string;
  phone: string;
  gudang: string;
  passwordHash: string;
};

type Purpose = "internal_register";

function sheetClient() {
  const creds = loadServiceAccountCredentials();
  if (!creds) {
    throw new SupplierAuthError("Service account Google belum diatur.", 500);
  }
  const auth = new google.auth.JWT({
    email: creds.client_email,
    key: creds.private_key,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  return { sheets: google.sheets({ version: "v4", auth }), sheetId: getInternalSheetId() };
}

function a1(tab: string, cells: string): string {
  return `'${tab.replace(/'/g, "''")}'!${cells}`;
}

async function ensureCodesTab(): Promise<void> {
  const { sheets, sheetId } = sheetClient();
  const tab = CODES_TAB();
  const meta = await sheets.spreadsheets.get({
    spreadsheetId: sheetId,
    fields: "sheets.properties.title",
  });
  if (!meta.data.sheets?.some((s) => s.properties?.title === tab)) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: sheetId,
      requestBody: { requests: [{ addSheet: { properties: { title: tab } } }] },
    });
  }
  const head = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: a1(tab, "1:1"),
  });
  if (String(head.data.values?.[0]?.[0] ?? "").toLowerCase() !== CODE_HEADERS[0]) {
    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: a1(tab, "A1:F1"),
      valueInputOption: "RAW",
      requestBody: { values: [Array.from(CODE_HEADERS)] },
    });
  }
}

async function loadCodeRows(): Promise<string[][]> {
  const { sheets, sheetId } = sheetClient();
  await ensureCodesTab();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: a1(CODES_TAB(), "A:F"),
  });
  return res.data.values ?? [];
}

async function writeCodeRows(rows: string[][]): Promise<void> {
  const { sheets, sheetId } = sheetClient();
  const tab = CODES_TAB();
  await sheets.spreadsheets.values.clear({ spreadsheetId: sheetId, range: a1(tab, "A:F") });
  if (rows.length) {
    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: a1(tab, "A1"),
      valueInputOption: "RAW",
      requestBody: { values: rows },
    });
  }
}

export async function assertInternalCodeResendAllowed(username: string): Promise<void> {
  const rows = await loadCodeRows();
  const now = Date.now();
  const purpose: Purpose = "internal_register";
  for (let i = 1; i < rows.length; i += 1) {
    const row = rows[i] ?? [];
    if (String(row[0]).toLowerCase() !== username || row[1] !== purpose) continue;
    const created = Date.parse(row[4] ?? "");
    if (Number.isFinite(created) && now - created < 60_000) {
      const wait = Math.ceil((60_000 - (now - created)) / 1000);
      throw new SupplierAuthError(`Tunggu ${wait} detik sebelum kirim ulang kode.`, 429);
    }
  }
}

export async function saveInternalAuthCode(params: {
  username: string;
  code: string;
  payload: InternalRegisterPayload;
}): Promise<void> {
  const rows = await loadCodeRows();
  const now = Date.now();
  const purpose: Purpose = "internal_register";
  const kept = [rows[0]?.length ? rows[0] : Array.from(CODE_HEADERS)];
  for (let i = 1; i < rows.length; i += 1) {
    const row = rows[i] ?? [];
    const expires = Date.parse(row[3] ?? "");
    const same = String(row[0]).toLowerCase() === params.username && row[1] === purpose;
    if (same || !Number.isFinite(expires) || expires < now) continue;
    kept.push(row);
  }
  kept.push([
    params.username,
    purpose,
    hashVerificationCode(params.code),
    new Date(now + 15 * 60 * 1000).toISOString(),
    new Date(now).toISOString(),
    JSON.stringify(params.payload),
  ]);
  await writeCodeRows(kept);
}

export async function consumeInternalAuthCode(
  username: string,
  code: string
): Promise<InternalRegisterPayload | null> {
  const rows = await loadCodeRows();
  const now = Date.now();
  const purpose: Purpose = "internal_register";
  let match = -1;
  for (let i = 1; i < rows.length; i += 1) {
    const row = rows[i] ?? [];
    if (String(row[0]).toLowerCase() !== username) continue;
    if (row[1] !== purpose) continue;
    if (!verificationCodeMatches(code, row[2] ?? "")) continue;
    const expires = Date.parse(row[3] ?? "");
    if (!Number.isFinite(expires) || expires < now) continue;
    match = i;
    break;
  }
  if (match < 0) return null;
  const payloadRaw = rows[match]?.[5] ?? "";
  const kept = rows.filter((_, idx) => idx !== match);
  await writeCodeRows(kept.length ? kept : [Array.from(CODE_HEADERS)]);
  if (!payloadRaw) return null;
  return JSON.parse(payloadRaw) as InternalRegisterPayload;
}
