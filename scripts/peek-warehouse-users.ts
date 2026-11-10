import { google } from "googleapis";
import { getInternalSheetId, getInternalUsersTab } from "../src/lib/config/internal-sheet";
import { loadServiceAccountCredentials } from "../src/lib/providers/google-workspace/config";
import { loadEnvFile } from "./load-env";

loadEnvFile();

const WAREHOUSE_SHEET = "1CNmLX2Qca-9GxDJTh77W8VaVaDAcMchqj7tzeeYEyZw";
const OLD_INTERNAL = "1PTxO6HbOccYn30g1l7SaGpGIcV0PBcuLmqzC3me5GYM";

async function dump(sheets: ReturnType<typeof google.sheets>, id: string, tab: string) {
  try {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: id,
      range: `'${tab}'!A1:K30`,
    });
    console.log(`\n--- ${id} / ${tab} (${(res.data.values ?? []).length} rows) ---`);
    for (const row of res.data.values ?? []) console.log(row.join(" | "));
  } catch (e) {
    console.log(`\n--- ${id} / ${tab}:`, e instanceof Error ? e.message : e);
  }
}

async function main() {
  const creds = loadServiceAccountCredentials();
  const auth = new google.auth.JWT({
    email: creds!.client_email,
    key: creds!.private_key,
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });
  const sheets = google.sheets({ version: "v4", auth });
  const meta = await sheets.spreadsheets.get({
    spreadsheetId: WAREHOUSE_SHEET,
    fields: "sheets.properties.title",
  });
  console.log("Warehouse credential tabs:", meta.data.sheets?.map((s) => s.properties?.title).join(", "));
  await dump(sheets, WAREHOUSE_SHEET, "Sheet1");
  await dump(sheets, WAREHOUSE_SHEET, "Users");
  await dump(sheets, WAREHOUSE_SHEET, "AuthCodes");
  await dump(sheets, WAREHOUSE_SHEET, "WarehouseAuthCodes");
  await dump(sheets, OLD_INTERNAL, "Sheet1");
  console.log("\nConfig env tab:", getInternalUsersTab(), "sheetId:", getInternalSheetId());
}

main();
