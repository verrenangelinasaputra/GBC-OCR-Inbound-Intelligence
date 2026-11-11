/** Sinkronkan header OCR (kolom A–AA) pada tab utama Data Compilation / Sheet1. */
import { google } from "googleapis";
import { OCR_SHEET_HEADERS } from "../src/lib/providers/google-workspace/google-sj-export-rows";
import { OCR_SHEET_RANGE_COL } from "../src/lib/providers/google-workspace/ocr-sheet-columns";
import { getGoogleExportConfigOptional } from "../src/lib/providers/google-workspace";
import { createGoogleAuthClient, resolveSheetTabName } from "../src/lib/providers/google-workspace/client";
import { loadEnvFile } from "./load-env";

loadEnvFile();

async function main() {
  const config = getGoogleExportConfigOptional();
  if (!config) throw new Error("GOOGLE_EXPORT tidak dikonfigurasi");
  const auth = createGoogleAuthClient(config);
  const sheets = google.sheets({ version: "v4", auth });
  const tab = await resolveSheetTabName(config);
  await sheets.spreadsheets.values.update({
    spreadsheetId: config.sheetId,
    range: `'${tab.replace(/'/g, "''")}'!A1:${OCR_SHEET_RANGE_COL}1`,
    valueInputOption: "RAW",
    requestBody: { values: [Array.from(OCR_SHEET_HEADERS)] },
  });
  console.log(`Header OCR diperbarui (${OCR_SHEET_HEADERS.length} kolom) pada tab "${tab}".`);
  console.log("Jalankan juga: npm run sheet:monitoring  (tab gudang + Sample Only).");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
