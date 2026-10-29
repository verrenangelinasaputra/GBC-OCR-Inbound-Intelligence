import { loadEnvFile } from "./load-env";
import { getGoogleExportConfigOptional } from "../src/lib/providers/google-workspace/config";
import { appendRowsToSheet } from "../src/lib/providers/google-workspace/client";

loadEnvFile();

async function main() {
  const cfg = getGoogleExportConfigOptional();
  if (!cfg) {
    console.log("Not configured");
    process.exit(1);
  }
  await appendRowsToSheet({
    config: cfg,
    rows: [["TEST", new Date().toISOString(), "hello from gbc-inbound test row — boleh dihapus"]],
  });
  console.log("Sheet append OK");
}

main().catch((e) => {
  console.error("FAIL", e.message || e);
  process.exit(1);
});
