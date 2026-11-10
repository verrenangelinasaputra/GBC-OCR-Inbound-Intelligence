import { google } from "googleapis";
import { getCredentialsSpreadsheetId } from "../src/lib/config/credentials-sheet";
import { loadServiceAccountCredentials } from "../src/lib/providers/google-workspace/config";
import { loadEnvFile } from "./load-env";

loadEnvFile();

const OLD_INTERNAL = "1PTxO6HbOccYn30g1l7SaGpGIcV0PBcuLmqzC3me5GYM";
const OLD_SUPPLIER = "156m4HFAUnqubtCJumBJZ9BCCel_kNVcU_ZV9kHi4HtY";

async function peek(sheets: ReturnType<typeof google.sheets>, id: string, range: string, label: string) {
  try {
    const res = await sheets.spreadsheets.values.get({ spreadsheetId: id, range });
    console.log(`\n=== ${label} (${id}) ===`);
    for (const row of res.data.values ?? []) console.log(row.join(" | "));
    if (!res.data.values?.length) console.log("(kosong)");
  } catch (e) {
    console.log(`\n=== ${label} === ERROR:`, e instanceof Error ? e.message : e);
  }
}

async function main() {
  const creds = loadServiceAccountCredentials();
  if (!creds) process.exit(1);
  const auth = new google.auth.JWT({
    email: creds.client_email,
    key: creds.private_key,
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });
  const sheets = google.sheets({ version: "v4", auth });
  const newId = getCredentialsSpreadsheetId();

  const meta = await sheets.spreadsheets.get({
    spreadsheetId: newId,
    fields: "sheets.properties.title",
  });
  console.log("Spreadsheet baru tabs:", meta.data.sheets?.map((s) => s.properties?.title).join(", "));

  await peek(sheets, newId, "'Sheet1'!A1:K10", "Warehouse Sheet1");
  await peek(sheets, newId, "'Users'!A1:F10", "Supplier Users");
  await peek(sheets, newId, "'WarehouseAuthCodes'!A1:F5", "WarehouseAuthCodes");
  await peek(sheets, OLD_INTERNAL, "'Sheet1'!A1:K10", "OLD internal Sheet1");
  await peek(sheets, OLD_SUPPLIER, "'Users'!A1:F10", "OLD supplier Users");
}

main();
