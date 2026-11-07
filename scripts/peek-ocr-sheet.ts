import { loadEnvFile } from "./load-env";
import { google } from "googleapis";
import { createGoogleAuthClient } from "../src/lib/providers/google-workspace/client";
import { getGoogleExportConfigOptional } from "../src/lib/providers/google-workspace";
import {
  GBC_OCR_RESULTS_SHEET_ID,
  GBC_OCR_RESULTS_SHEET_URL,
} from "../src/lib/config/ocr-export-target";

loadEnvFile();

async function main() {
  const cfg = getGoogleExportConfigOptional();
  if (!cfg) {
    console.error("Google export tidak dikonfigurasi");
    process.exit(1);
  }

  console.log("Sheet ID (efektif):", cfg.sheetId);
  console.log("Expected GBC sheet:", GBC_OCR_RESULTS_SHEET_ID);
  console.log("Match:", cfg.sheetId === GBC_OCR_RESULTS_SHEET_ID);
  console.log("Tab config:", cfg.sheetTab);
  console.log("URL:", GBC_OCR_RESULTS_SHEET_URL);

  const auth = createGoogleAuthClient(cfg);
  const sheets = google.sheets({ version: "v4", auth });

  const meta = await sheets.spreadsheets.get({ spreadsheetId: cfg.sheetId });
  const tabs = meta.data.sheets?.map((s) => s.properties?.title) ?? [];
  console.log("\nTab di spreadsheet:", tabs.join(" | "));

  for (const tab of [cfg.sheetTab, tabs[0]].filter(Boolean)) {
    const range = `${tab}!A:O`;
    try {
      const res = await sheets.spreadsheets.values.get({
        spreadsheetId: cfg.sheetId,
        range,
      });
      const rows = res.data.values ?? [];
      console.log(`\n--- ${tab}: ${rows.length} baris (termasuk header) ---`);
      const tail = rows.slice(-5);
      for (const row of tail) {
        console.log(JSON.stringify(row));
      }
    } catch (e) {
      console.log(`\nGagal baca tab "${tab}":`, e instanceof Error ? e.message : e);
    }
  }

  const targetId = GBC_OCR_RESULTS_SHEET_ID;
  if (cfg.sheetId !== targetId) {
    console.log("\n>>> Juga cek sheet target GBC (bukan yang di .env):");
    const res2 = await sheets.spreadsheets.values.get({
      spreadsheetId: targetId,
      range: "Sheet1!A:O",
    });
    const rows2 = res2.data.values ?? [];
    console.log(`Target GBC: ${rows2.length} baris`);
    for (const row of rows2.slice(-3)) console.log(JSON.stringify(row));
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
