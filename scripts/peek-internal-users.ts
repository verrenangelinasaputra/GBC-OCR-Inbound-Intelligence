import { google } from "googleapis";
import { getCredentialsSpreadsheetId } from "../src/lib/config/credentials-sheet";
import { getInternalUsersTab } from "../src/lib/config/internal-sheet";
import { loadServiceAccountCredentials } from "../src/lib/providers/google-workspace/config";
import { loadEnvFile } from "./load-env";

loadEnvFile();

async function main() {
  const creds = loadServiceAccountCredentials();
  if (!creds) process.exit(1);
  const sheetId = getCredentialsSpreadsheetId();
  const tab = getInternalUsersTab();
  const auth = new google.auth.JWT({
    email: creds.client_email,
    key: creds.private_key,
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });
  const sheets = google.sheets({ version: "v4", auth });
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: `'${tab}'!A1:K20`,
  });
  const rows = res.data.values ?? [];
  console.log(`Tab "${tab}" — ${rows.length} baris (termasuk header):`);
  for (const row of rows) {
    console.log(row.join(" | "));
  }
  const codesTab = process.env.INTERNAL_AUTH_CODES_TAB?.trim() || "WarehouseAuthCodes";
  try {
    const codes = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: `'${codesTab}'!A1:F10`,
    });
    console.log(`\nTab "${codesTab}":`, (codes.data.values ?? []).length, "baris");
    for (const row of codes.data.values ?? []) console.log(row.join(" | "));
  } catch {
    console.log(`\nTab "${codesTab}" belum ada atau kosong.`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
