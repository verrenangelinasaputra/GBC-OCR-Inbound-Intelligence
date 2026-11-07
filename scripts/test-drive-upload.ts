import { loadEnvFile } from "./load-env";
import { getGoogleExportConfig } from "../src/lib/providers/google-workspace/config";
import { uploadFileToDrive } from "../src/lib/providers/google-workspace/client";
import { isDriveOAuthConfigured } from "../src/lib/providers/google-workspace/drive-oauth";

loadEnvFile();

async function main() {
  const cfg = getGoogleExportConfig();
  console.log("Folder:", cfg.driveFolderId);
  console.log("OAuth Drive:", isDriveOAuthConfigured() ? "ya" : "tidak");
  console.log("Upload auth mode:", process.env.GOOGLE_DRIVE_UPLOAD_AUTH ?? "(auto: SA, fallback OAuth jika gagal quota)");

  const tiny = Buffer.from("GBC drive upload test");
  const res = await uploadFileToDrive({
    config: cfg,
    buffer: tiny,
    fileName: `drive-test-${Date.now()}.txt`,
    mimeType: "text/plain",
  });
  console.log("OK", res.fileUrl);
}

main().catch((e) => {
  console.error("FAIL", e instanceof Error ? e.message : e);
  process.exit(1);
});
