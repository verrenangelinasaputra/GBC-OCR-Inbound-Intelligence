import { google } from "googleapis";
import { loadEnvFile } from "./load-env";
import { getGoogleExportConfigOptional } from "../src/lib/providers/google-workspace";
import { createGoogleAuthClient, ensureOcrSheetHeaders } from "../src/lib/providers/google-workspace/client";
import { ensureInboundMonitoringWorkbook } from "../src/lib/providers/google-workspace/inbound-monitoring-layout";
import { GBC_OCR_RESULTS_SHEET_URL } from "../src/lib/config/ocr-export-target";

loadEnvFile();

async function main() {
  const cfg = getGoogleExportConfigOptional();
  if (!cfg) {
    console.error("Google export tidak dikonfigurasi");
    process.exit(1);
  }
  const auth = createGoogleAuthClient(cfg);
  const sheets = google.sheets({ version: "v4", auth });
  console.log("Sheet:", GBC_OCR_RESULTS_SHEET_URL);
  await ensureOcrSheetHeaders(cfg);
  await ensureInboundMonitoringWorkbook(cfg, sheets);
  console.log("Selesai — Data Compilation + 6 tab gudang + _DataCalc + Summary.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
