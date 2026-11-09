import { loadEnvFile } from "./load-env";
import { getGoogleExportConfigOptional } from "../src/lib/providers/google-workspace";
import { ensureOcrSheetHeaders } from "../src/lib/providers/google-workspace/client";
import { GBC_OCR_RESULTS_SHEET_URL } from "../src/lib/config/ocr-export-target";

loadEnvFile();

async function main() {
  const cfg = getGoogleExportConfigOptional();
  if (!cfg) {
    console.error("Google export tidak dikonfigurasi — set GOOGLE_SERVICE_ACCOUNT_JSON");
    process.exit(1);
  }

  console.log("Menulis header OCR ke tab:", cfg.sheetTab);
  console.log("Sheet:", GBC_OCR_RESULTS_SHEET_URL);
  await ensureOcrSheetHeaders(cfg);
  console.log("Selesai — header v2 (18 kolom) + format warna. Baris data lama tidak otomatis dipindah kolom.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
