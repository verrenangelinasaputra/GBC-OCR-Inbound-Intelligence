import fs from "node:fs";
import path from "node:path";

export type GoogleExportConfig = {
  enabled: boolean;
  driveFolderId: string;
  sheetId: string;
  sheetTab: string;
  credentials: { client_email: string; private_key: string };
  /** Google Workspace user to impersonate (domain-wide delegation). Wajib untuk upload ke folder My Drive. */
  impersonateUserEmail?: string;
};

export function isGoogleExportConfigured(): boolean {
  return getGoogleExportConfigOptional() != null;
}

export function getGoogleExportConfigOptional(): GoogleExportConfig | null {
  if (process.env.GOOGLE_EXPORT_ENABLED !== "true") return null;

  const driveFolderId = process.env.GOOGLE_DRIVE_FOLDER_ID?.trim();
  const sheetId = process.env.GOOGLE_SHEET_ID?.trim();
  if (!driveFolderId || !sheetId) return null;

  const creds = loadServiceAccountCredentials();
  if (!creds) return null;

  const impersonateUserEmail = process.env.GOOGLE_WORKSPACE_DELEGATED_USER?.trim() || undefined;

  return {
    enabled: true,
    driveFolderId,
    sheetId,
    sheetTab: process.env.GOOGLE_SHEET_TAB?.trim() || "Sheet1",
    credentials: creds,
    impersonateUserEmail,
  };
}

export function getGoogleExportConfig(): GoogleExportConfig {
  const cfg = getGoogleExportConfigOptional();
  if (!cfg) {
    throw new Error(
      "Google export belum dikonfigurasi. Set GOOGLE_EXPORT_ENABLED=true, GOOGLE_DRIVE_FOLDER_ID, GOOGLE_SHEET_ID, dan service account JSON."
    );
  }
  return cfg;
}

function loadServiceAccountCredentials(): { client_email: string; private_key: string } | null {
  const inline = process.env.GOOGLE_SERVICE_ACCOUNT_JSON?.trim();
  if (inline) {
    try {
      const parsed = JSON.parse(inline) as { client_email?: string; private_key?: string };
      if (parsed.client_email && parsed.private_key) {
        return { client_email: parsed.client_email, private_key: parsed.private_key };
      }
    } catch {
      return null;
    }
  }

  const filePath =
    process.env.GOOGLE_SERVICE_ACCOUNT_JSON_PATH?.trim() ||
    process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim();
  if (!filePath) return null;

  const resolved = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);
  if (!fs.existsSync(resolved)) return null;

  const parsed = JSON.parse(fs.readFileSync(resolved, "utf8")) as {
    client_email?: string;
    private_key?: string;
  };
  if (!parsed.client_email || !parsed.private_key) return null;
  return { client_email: parsed.client_email, private_key: parsed.private_key };
}
