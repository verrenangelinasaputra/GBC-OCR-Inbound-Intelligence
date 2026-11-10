import { google } from "googleapis";
import { loadServiceAccountCredentials } from "../src/lib/providers/google-workspace/config";
import { loadEnvFile } from "./load-env";

loadEnvFile();

const id = "1PTxO6HbOccYn30g1l7SaGpGIcV0PBcuLmqzC3me5GYM";

async function main() {
  const creds = loadServiceAccountCredentials();
  const auth = new google.auth.JWT({
    email: creds!.client_email,
    key: creds!.private_key,
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });
  const sheets = google.sheets({ version: "v4", auth });
  const m = await sheets.spreadsheets.get({ spreadsheetId: id, fields: "sheets.properties.title" });
  console.log("tabs:", m.data.sheets?.map((s) => s.properties?.title).join(", "));
  const r = await sheets.spreadsheets.values.get({ spreadsheetId: id, range: "'Sheet1'!A1:K8" });
  for (let i = 0; i < (r.data.values?.length ?? 0); i++) {
    console.log(`row ${i + 1}:`, JSON.stringify(r.data.values![i]));
  }
  for (const tab of ["AuthCodes", "WarehouseAuthCodes"]) {
    try {
      const c = await sheets.spreadsheets.values.get({ spreadsheetId: id, range: `'${tab}'!A1:F8` });
      console.log(`\n${tab}:`, c.data.values?.length ?? 0, "rows");
      for (const row of c.data.values ?? []) console.log(" ", row.join(" | "));
    } catch {
      console.log(`\n${tab}: (tidak ada)`);
    }
  }
}

main();
