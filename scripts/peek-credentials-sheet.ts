import { google } from "googleapis";
import { CREDENTIALS_SHEET_URL, getCredentialsSpreadsheetId } from "../src/lib/config/credentials-sheet";
import { loadServiceAccountCredentials } from "../src/lib/providers/google-workspace/config";
import { loadEnvFile } from "./load-env";

loadEnvFile();

async function main() {
  const creds = loadServiceAccountCredentials();
  if (!creds) {
    console.error("GOOGLE_SERVICE_ACCOUNT_JSON_PATH belum diatur.");
    process.exit(1);
  }
  const sheetId = getCredentialsSpreadsheetId();
  const auth = new google.auth.JWT({
    email: creds.client_email,
    key: creds.private_key,
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });
  const sheets = google.sheets({ version: "v4", auth });
  const meta = await sheets.spreadsheets.get({
    spreadsheetId: sheetId,
    fields: "properties.title,sheets.properties.title",
  });
  console.log("Spreadsheet:", meta.data.properties?.title);
  console.log("ID:", sheetId);
  console.log("URL:", CREDENTIALS_SHEET_URL);
  console.log("Service account:", creds.client_email);
  console.log("Tabs:", meta.data.sheets?.map((s) => s.properties?.title).join(", "));
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  console.error(
    "Pastikan sheet di-share sebagai Editor ke service account di atas (bukan hanya link publik)."
  );
  process.exit(1);
});
