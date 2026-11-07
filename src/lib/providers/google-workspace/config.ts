import fs from "node:fs";
import path from "node:path";
import {
  getOcrExportDriveFolderId,
  getOcrExportSheetId,
  getOcrExportSheetTab,
} from "@/lib/config/ocr-export-target";

export type GoogleExportConfig = {
  enabled: boolean;
  driveFolderId: string;
  sheetId: string;
  sheetTab: string;
  credentials: { client_email: string; private_key: string };
  /** Google Workspace user to impersonate (domain-wide delegation). Wajib untuk upload ke folder My Drive. */
  impersonateUserEmail?: string;
};

/** Aktif jika `GOOGLE_EXPORT_ENABLED=true`, atau mode pilot `SHEET_ONLY_MODE=true` (kecuali explicitly false). */
export function isGoogleExportEnabled(): boolean {
  if (process.env.GOOGLE_EXPORT_ENABLED === "false") return false;
  if (process.env.GOOGLE_EXPORT_ENABLED === "true") return true;
  return process.env.SHEET_ONLY_MODE === "true";
}

export function isGoogleExportConfigured(): boolean {
  return getGoogleExportConfigOptional() != null;
}

export function getGoogleExportConfigOptional(): GoogleExportConfig | null {
  if (!isGoogleExportEnabled()) return null;

  const driveFolderId = getOcrExportDriveFolderId();
  const sheetId = getOcrExportSheetId();
  if (!driveFolderId || !sheetId) return null;

  const creds = loadServiceAccountCredentials();
  if (!creds) return null;

  const impersonateUserEmail = process.env.GOOGLE_WORKSPACE_DELEGATED_USER?.trim() || undefined;

  return {
    enabled: true,
    driveFolderId,
    sheetId,
    sheetTab: getOcrExportSheetTab(),
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

function normalizePrivateKey(key: string): string {
  const trimmed = key.trim();
  if (trimmed.includes("\\n")) {
    return trimmed.replace(/\\n/g, "\n");
  }
  return trimmed;
}

function parseServiceAccountJson(raw: string): { client_email: string; private_key: string } | null {
  try {
    const parsed = JSON.parse(raw) as { client_email?: string; private_key?: string };
    if (!parsed.client_email || !parsed.private_key) return null;
    return {
      client_email: parsed.client_email,
      private_key: normalizePrivateKey(parsed.private_key),
    };
  } catch {
    return null;
  }
}

export function loadServiceAccountCredentials(): { client_email: string; private_key: string } | null {
  const base64 = process.env.GOOGLE_SERVICE_ACCOUNT_JSON_BASE64?.trim();
  if (base64) {
    try {
      const raw = Buffer.from(base64, "base64").toString("utf8");
      const creds = parseServiceAccountJson(raw);
      if (creds) return creds;
    } catch {
      /* fall through */
    }
  }

  const inline = process.env.GOOGLE_SERVICE_ACCOUNT_JSON?.trim();
  if (inline) {
    const creds = parseServiceAccountJson(inline);
    if (creds) return creds;
  }

  // Vercel has no secrets/ files — use GOOGLE_SERVICE_ACCOUNT_JSON env instead.
  if (process.env.VERCEL === "1") return null;

  const filePath =
    process.env.GOOGLE_SERVICE_ACCOUNT_JSON_PATH?.trim() ||
    process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim();
  if (!filePath) return null;

  const resolved = path.isAbsolute(filePath)
    ? filePath
    : path.join(process.cwd(), "secrets", path.basename(filePath));
  if (!fs.existsSync(resolved)) return null;

  const creds = parseServiceAccountJson(fs.readFileSync(resolved, "utf8"));
  return creds;
}
