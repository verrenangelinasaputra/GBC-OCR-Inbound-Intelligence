/** Buat tab "Customer" di spreadsheet hasil OCR + header kolom A–AB (sama dengan Data Compilation). */
import { loadEnvFile } from "./load-env";
import { GBC_OCR_RESULTS_SHEET_URL, OCR_CUSTOMER_TAB_NAME } from "../src/lib/config/ocr-export-target";
import { getGoogleExportConfigOptional } from "../src/lib/providers/google-workspace";
import {
  ensureOcrSheetHeaders,
  ensureSpreadsheetTabExists,
} from "../src/lib/providers/google-workspace/client";
import { google } from "googleapis";
import { createGoogleAuthClient } from "../src/lib/providers/google-workspace/client";

loadEnvFile();

async function main() {
  const cfg = getGoogleExportConfigOptional();
  if (!cfg) {
    console.error("Google export tidak dikonfigurasi — set GOOGLE_SERVICE_ACCOUNT_JSON");
    process.exit(1);
  }

  const auth = createGoogleAuthClient(cfg);
  const sheets = google.sheets({ version: "v4", auth });
  console.log("Sheet:", GBC_OCR_RESULTS_SHEET_URL);
  await ensureSpreadsheetTabExists(sheets, cfg.sheetId, OCR_CUSTOMER_TAB_NAME);
  console.log("Tab", OCR_CUSTOMER_TAB_NAME, "siap.");
  await ensureOcrSheetHeaders({ ...cfg, sheetTab: OCR_CUSTOMER_TAB_NAME });
  console.log("Header OCR + format tab Customer selesai.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});