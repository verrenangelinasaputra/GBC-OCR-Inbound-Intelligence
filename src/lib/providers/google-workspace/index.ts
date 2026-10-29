import type { ProviderHealth } from "@/lib/providers/types";
import { getGoogleExportConfigOptional } from "./config";
import { createGoogleAuthClient } from "./client";

export { isGoogleExportConfigured, getGoogleExportConfigOptional, getGoogleExportConfig } from "./config";
export {
  buildGoogleSheetRows,
  buildSuratJalanFileName,
  parseGeminiPayloadFromStructured,
} from "./google-sj-export-rows";
export { uploadFileToDrive, appendRowsToSheet } from "./client";

export async function getGoogleWorkspaceHealth(): Promise<ProviderHealth & { serviceAccountEmail?: string }> {
  if (process.env.GOOGLE_EXPORT_ENABLED !== "true") {
    return {
      providerKey: "google_workspace",
      displayName: "Google Drive + Sheets export",
      status: "DISABLED",
      message: "GOOGLE_EXPORT_ENABLED bukan true",
    };
  }

  const cfg = getGoogleExportConfigOptional();
  if (!cfg) {
    return {
      providerKey: "google_workspace",
      displayName: "Google Drive + Sheets export",
      status: "NOT_CONFIGURED",
      message:
        "Set GOOGLE_SERVICE_ACCOUNT_JSON_PATH (atau JSON inline), GOOGLE_DRIVE_FOLDER_ID, GOOGLE_SHEET_ID",
    };
  }

  return {
    providerKey: "google_workspace",
    displayName: "Google Drive + Sheets export",
    status: "CONNECTED",
    message: `Export otomatis setelah OCR → tab ${cfg.sheetTab}`,
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
