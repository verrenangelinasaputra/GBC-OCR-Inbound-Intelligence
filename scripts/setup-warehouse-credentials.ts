/**
 * Siapkan tab Users + AuthCodes di spreadsheet warehouse (sama pola supplier).
 * Salin baris dari Sheet1 jika Users masih kosong.
 */
import { google } from "googleapis";
import { INTERNAL_USER_HEADERS } from "../src/lib/internal-auth/directory";
import { getInternalSheetId, getInternalUsersTab } from "../src/lib/config/internal-sheet";
import { loadServiceAccountCredentials } from "../src/lib/providers/google-workspace/config";
import { loadEnvFile } from "./load-env";

loadEnvFile();

const AUTH_CODE_HEADERS = [
  "username",
  "purpose",
  "code_hash",
  "expires_at",
  "created_at",
  "payload_json",
] as const;

const CODES_TAB = () => process.env.INTERNAL_AUTH_CODES_TAB?.trim() || "AuthCodes";

function a1(tab: string, cells: string): string {
  return `'${tab.replace(/'/g, "''")}'!${cells}`;
}

async function ensureTab(
  sheets: ReturnType<typeof google.sheets>,
  sheetId: string,
  tab: string,
  headers: readonly string[]
): Promise<void> {
  const meta = await sheets.spreadsheets.get({ spreadsheetId: sheetId, fields: "sheets.properties.title" });
  if (!meta.data.sheets?.some((s) => s.properties?.title === tab)) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: sheetId,
      requestBody: { requests: [{ addSheet: { properties: { title: tab } } }] },
    });
  }
  const head = await sheets.spreadsheets.values.get({ spreadsheetId: sheetId, range: a1(tab, "1:1") });
  const first = String(head.data.values?.[0]?.[0] ?? "").trim().toLowerCase();
  if (first === headers[0].toLowerCase()) return;
  if (first) {
    console.warn(`Tab "${tab}" baris 1 bukan header ${headers[0]} — lewati tulis header.`);
    return;
  }
  await sheets.spreadsheets.values.update({
    spreadsheetId: sheetId,
    range: a1(tab, headers.length <= 11 ? `A1:K1` : `A1:F1`),
    valueInputOption: "RAW",
    requestBody: { values: [Array.from(headers)] },
  });
}

async function main() {
  const creds = loadServiceAccountCredentials();
  if (!creds) throw new Error("Service account belum diatur");
  const sheetId = getInternalSheetId();
  const usersTab = getInternalUsersTab();
  const codesTab = CODES_TAB();
  const auth = new google.auth.JWT({
    email: creds.client_email,
    key: creds.private_key,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  const sheets = google.sheets({ version: "v4", auth });

  await ensureTab(sheets, sheetId, usersTab, INTERNAL_USER_HEADERS);
  await ensureTab(sheets, sheetId, codesTab, AUTH_CODE_HEADERS);

  const users = await sheets.spreadsheets.values.get({ spreadsheetId: sheetId, range: a1(usersTab, "A2:K") });
  const hasUsers = (users.data.values ?? []).some((r) => String(r[0] ?? "").trim());

  if (!hasUsers) {
    let fromTab = "Sheet1";
    try {
      await sheets.spreadsheets.values.get({ spreadsheetId: sheetId, range: a1(fromTab, "A1:K1") });
    } catch {
      fromTab = "";
    }
    if (fromTab) {
      const legacy = await sheets.spreadsheets.values.get({
        spreadsheetId: sheetId,
        range: a1(fromTab, "A2:K"),
      });
      const rows = legacy.data.values ?? [];
      if (rows.length) {
        await sheets.spreadsheets.values.append({
          spreadsheetId: sheetId,
          range: a1(usersTab, "A:K"),
          valueInputOption: "RAW",
          insertDataOption: "INSERT_ROWS",
          requestBody: { values: rows },
        });
        console.log(`Salin ${rows.length} baris dari Sheet1 → ${usersTab}`);
      }
    }
  }

  console.log("Warehouse credentials siap:");
  console.log("  Spreadsheet:", sheetId);
  console.log("  Tab akun:", usersTab);
  console.log("  Tab kode:", codesTab);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
