import type { ProviderHealth } from "@/lib/providers/types";
import { getGoogleExportConfigOptional, isGoogleExportEnabled } from "./config";
import { createGoogleAuthClient } from "./client";

export {
  isGoogleExportConfigured,
  isGoogleExportEnabled,
  getGoogleExportConfigOptional,
  getGoogleExportConfig,
} from "./config";
export {
  buildGoogleSheetRows,
  buildSuratJalanFileName,
  parseGeminiPayloadFromStructured,
} from "./google-sj-export-rows";
export { uploadFileToDrive, appendRowsToSheet } from "./client";

export async function getGoogleWorkspaceHealth(): Promise<ProviderHealth & { serviceAccountEmail?: string }> {
  if (!isGoogleExportEnabled()) {
    return {
      providerKey: "google_workspace",
      displayName: "Google Drive + Sheets export",
      status: "DISABLED",
      message: "Google export nonaktif — GOOGLE_EXPORT_ENABLED=true atau SHEET_ONLY_MODE=true",
    };
  }

  const cfg = getGoogleExportConfigOptional();
  if (!cfg) {
    const onVercel = process.env.VERCEL === "1";
    return {
      providerKey: "google_workspace",
      displayName: "Google Drive + Sheets export",
      status: "NOT_CONFIGURED",
      message: onVercel
        ? "Di Vercel: isi GOOGLE_SERVICE_ACCOUNT_JSON (isi penuh file .json) atau GOOGLE_SERVICE_ACCOUNT_JSON_BASE64 — path ke secrets/ tidak ikut deploy."
        : "Set GOOGLE_SERVICE_ACCOUNT_JSON (inline), GOOGLE_SERVICE_ACCOUNT_JSON_PATH, GOOGLE_DRIVE_FOLDER_ID, GOOGLE_SHEET_ID",
    };
  }

  return {
    providerKey: "google_workspace",
    displayName: "Google Drive + Sheets export",
    status: "CONNECTED",
    message: `Sheet ${cfg.sheetId} (${cfg.sheetTab}) · Drive folder ${cfg.driveFolderId}`,
    serviceAccountEmail: cfg.credentials.client_email,
  };
}

export async function testGoogleWorkspaceConnection(): Promise<{ ok: boolean; message: string }> {
  const cfg = getGoogleExportConfigOptional();
  if (!cfg) {
    return { ok: false, message: "Google export tidak dikonfigurasi" };
  }
  try {
    const auth = createGoogleAuthClient(cfg);
    await auth.authorize();
    return {
      ok: true,
      message: `Auth OK (${cfg.credentials.client_email}) — share folder & sheet ke email ini`,
    };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Auth gagal" };
  }
}
