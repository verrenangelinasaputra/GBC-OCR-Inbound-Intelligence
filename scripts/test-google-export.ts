import { loadEnvFile } from "./load-env";
import { getGoogleExportConfigOptional } from "../src/lib/providers/google-workspace/config";
import { testGoogleWorkspaceConnection } from "../src/lib/providers/google-workspace";

loadEnvFile();

async function main() {
  const cfg = getGoogleExportConfigOptional();
  if (!cfg) {
    console.log("FAIL Google export tidak dikonfigurasi");
    console.log("Cek .env:");
    console.log("  GOOGLE_EXPORT_ENABLED=true");
    console.log("  GOOGLE_DRIVE_FOLDER_ID, GOOGLE_SHEET_ID");
    console.log("  GOOGLE_SERVICE_ACCOUNT_JSON_PATH → file JSON ada di disk");
    if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON_PATH) {
      console.log("  Path saat ini:", process.env.GOOGLE_SERVICE_ACCOUNT_JSON_PATH.trim());
    }
    process.exit(1);
  }
  const result = await testGoogleWorkspaceConnection();
  console.log(result.ok ? "OK" : "FAIL", result.message);
  process.exit(result.ok ? 0 : 1);
}

main();
