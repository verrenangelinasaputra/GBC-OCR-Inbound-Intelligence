import { google } from "googleapis";
import { loadServiceAccountCredentials } from "../src/lib/providers/google-workspace/config";
import { loadEnvFile } from "./load-env";

loadEnvFile();

const SHEETS = [
  { label: "Warehouse", id: "1CNmLX2Qca-9GxDJTh77W8VaVaDAcMchqj7tzeeYEyZw", tabs: ["Users", "Sheet1", "AuthCodes"] },
  { label: "Old internal", id: "1PTxO6HbOccYn30g1l7SaGpGIcV0PBcuLmqzC3me5GYM", tabs: ["Sheet1", "Users"] },
];

async function main() {
  const creds = loadServiceAccountCredentials();
  const auth = new google.auth.JWT({
    email: creds!.client_email,
    key: creds!.private_key,
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });
  const sheets = google.sheets({ version: "v4", auth });

  for (const target of SHEETS) {
    console.log(`\n######## ${target.label} (${target.id})`);
    for (const tab of target.tabs) {
      try {
        const res = await sheets.spreadsheets.values.get({
          spreadsheetId: target.id,
          range: `'${tab}'!A2:E30`,
        });
        const rows = res.data.values ?? [];
        console.log(`\n[${tab}] ${rows.length} data rows (username col ~3):`);
        for (let i = 0; i < rows.length; i++) {
          const r = rows[i];
          const uname = String(r?.[2] ?? r?.[3] ?? "").trim();
          if (!uname && !r?.[0]) continue;
          console.log(`  row ${i + 2}: user=${uname || "(kosong)"} | name=${r?.[1] ?? ""} | email=${r?.[3] ?? r?.[4] ?? ""}`);
        }
        if (!rows.length) console.log("  (kosong)");
      } catch (e) {
        console.log(`\n[${tab}] tidak ada — ${e instanceof Error ? e.message : e}`);
      }
    }
  }
}

main();
