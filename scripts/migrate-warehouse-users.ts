/**
 * Salin akun warehouse dari spreadsheet internal lama (Sheet1) → warehouse baru (tab Users).
 */
import { google } from "googleapis";
import { DEFAULT_WAREHOUSE_CREDENTIALS_SHEET_ID } from "../src/lib/config/credentials-sheet";
import { INTERNAL_USER_HEADERS } from "../src/lib/internal-auth/directory";
import { getInternalSheetId, getInternalUsersTab } from "../src/lib/config/internal-sheet";
import { loadServiceAccountCredentials } from "../src/lib/providers/google-workspace/config";
import { loadEnvFile } from "./load-env";

loadEnvFile();

const LEGACY_INTERNAL_SHEET_ID = "1PTxO6HbOccYn30g1l7SaGpGIcV0PBcuLmqzC3me5GYM";

function a1(tab: string, cells: string): string {
  return `'${tab.replace(/'/g, "''")}'!${cells}`;
}

function normalizeRow(row: string[]): string[] {
  const legacy = String(row[4] ?? "").startsWith("$") || (String(row[4] ?? "").length > 40 && !row[5]);
  if (legacy) {
    return [
      row[0] ?? "",
      row[1] ?? "",
      row[2] ?? "",
      row[3] ?? "",
      "",
      "",
      row[4] ?? "",
      row[5] ?? "WAREHOUSE_OPERATOR",
      row[6] ?? "ACTIVE",
      row[7] ?? "",
      row[8] ?? "",
    ];
  }
  while (row.length < 11) row.push("");
  return row.slice(0, 11);
}

async function main() {
  const creds = loadServiceAccountCredentials();
  if (!creds) throw new Error("Service account tidak dikonfigurasi");

  const targetId = getInternalSheetId();
  const targetTab = getInternalUsersTab();
  const sourceId = process.env.MIGRATE_FROM_INTERNAL_SHEET_ID?.trim() || LEGACY_INTERNAL_SHEET_ID;

  const auth = new google.auth.JWT({
    email: creds.client_email,
    key: creds.private_key,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  const sheets = google.sheets({ version: "v4", auth });

  const source = await sheets.spreadsheets.values.get({
    spreadsheetId: sourceId,
    range: a1("Sheet1", "A2:K"),
  });
  const sourceRows = (source.data.values ?? []).filter((r) => String(r[0] ?? "").trim());

  const target = await sheets.spreadsheets.values.get({
    spreadsheetId: targetId,
    range: a1(targetTab, "A2:K"),
  });
  const existingUsernames = new Set(
    (target.data.values ?? [])
      .map((r) => String(r[2] ?? "").trim().toLowerCase())
      .filter(Boolean)
  );

  const toAppend: string[][] = [];
  for (const raw of sourceRows) {
    const row = normalizeRow(raw.map(String));
    const username = String(row[2]).trim().toLowerCase();
    if (!username || existingUsernames.has(username)) continue;
    toAppend.push(row);
    existingUsernames.add(username);
  }

  if (!toAppend.length) {
    console.log("Tidak ada akun baru untuk dipindah (semua username sudah ada di target).");
    return;
  }

  const head = await sheets.spreadsheets.values.get({
    spreadsheetId: targetId,
    range: a1(targetTab, "A1:K1"),
  });
  if (String(head.data.values?.[0]?.[0] ?? "").toLowerCase() !== "user_id") {
    await sheets.spreadsheets.values.update({
      spreadsheetId: targetId,
      range: a1(targetTab, "A1:K1"),
      valueInputOption: "RAW",
      requestBody: { values: [Array.from(INTERNAL_USER_HEADERS)] },
    });
  }

  await sheets.spreadsheets.values.append({
    spreadsheetId: targetId,
    range: a1(targetTab, "A:K"),
    valueInputOption: "RAW",
    insertDataOption: "INSERT_ROWS",
    requestBody: { values: toAppend },
  });

  console.log(`Pindah ${toAppend.length} akun dari ${sourceId} → ${targetId} tab "${targetTab}":`);
  for (const row of toAppend) {
    console.log(`  - ${row[2]} (${row[1]}) ${row[3]}`);
  }
  console.log(`\nSetelah ini, pastikan Vercel env:`);
  console.log(`  CREDENTIALS_SHEET_ID=${DEFAULT_WAREHOUSE_CREDENTIALS_SHEET_ID}`);
  console.log(`  INTERNAL_SHEET_TAB=Users`);
  console.log(`  (hapus INTERNAL_SHEET_ID lama jika masih 1PTxO6Hb…)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
