import { Readable } from "node:stream";
import { google } from "googleapis";
import type { GoogleExportConfig } from "./config";
import { createDriveOAuthClient, isDriveOAuthConfigured } from "./drive-oauth";
import { nextOcrDataRowNumber, OCR_SHEET_HEADERS } from "./google-sj-export-rows";

function driveScopes(config: GoogleExportConfig): string[] {
  return [
    "https://www.googleapis.com/auth/drive",
    "https://www.googleapis.com/auth/spreadsheets",
  ];
}

export function createGoogleAuthClient(config: GoogleExportConfig) {
  return new google.auth.JWT({
    email: config.credentials.client_email,
    key: config.credentials.private_key,
    scopes: driveScopes(config),
    subject: config.impersonateUserEmail,
  });
}

function preferOAuthDriveUpload(): boolean {
  const mode = process.env.GOOGLE_DRIVE_UPLOAD_AUTH?.trim().toLowerCase();
  if (mode === "service_account") return false;
  if (mode === "oauth") return isDriveOAuthConfigured();
  // Default: pakai OAuth jika env lengkap (hindari quota error service account di Vercel)
  return isDriveOAuthConfigured();
}

async function driveUploadWithAuth(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  auth: any,
  params: { folderId: string; buffer: Buffer; fileName: string; mimeType: string }
): Promise<{ fileId: string; fileUrl: string }> {
  const drive = google.drive({ version: "v3", auth });

  const res = await drive.files.create({
    requestBody: {
      name: params.fileName,
      parents: [params.folderId],
    },
    media: {
      mimeType: params.mimeType,
      body: bufferToStream(params.buffer),
    },
    fields: "id",
    supportsAllDrives: true,
    enforceSingleParent: true,
  });

  const fileId = res.data.id;
  if (!fileId) throw new Error("Drive upload tidak mengembalikan file ID");

  return {
    fileId,
    fileUrl: `https://drive.google.com/file/d/${fileId}/view?usp=drivesdk`,
  };
}

export async function uploadFileToDrive(params: {
  config: GoogleExportConfig;
  buffer: Buffer;
  fileName: string;
  mimeType: string;
}): Promise<{ fileId: string; fileUrl: string }> {
  const payload = {
    folderId: params.config.driveFolderId,
    buffer: params.buffer,
    fileName: params.fileName,
    mimeType: params.mimeType,
  };

  if (preferOAuthDriveUpload()) {
    const oauth = createDriveOAuthClient();
    if (!oauth) {
      throw new Error(
        "GOOGLE_DRIVE_UPLOAD_AUTH=oauth tapi GOOGLE_DRIVE_OAUTH_* belum lengkap — jalankan npm run drive:oauth-setup"
      );
    }
    return driveUploadWithAuth(oauth, payload);
  }

  const jwt = createGoogleAuthClient(params.config);
  try {
    return await driveUploadWithAuth(jwt, payload);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const oauth = createDriveOAuthClient();
    if (oauth && (msg.includes("storage quota") || msg.includes("Service Accounts"))) {
      return driveUploadWithAuth(oauth, payload);
    }
    throw err;
  }
}

function firstRowIsOcrHeader(row: string[] | undefined): boolean {
  if (!row?.length) return false;
  return String(row[0] ?? "").trim() === OCR_SHEET_HEADERS[0];
}

function firstRowLooksLikeOcrData(row: string[] | undefined): boolean {
  if (!row?.length) return false;
  const exported = String(row[0] ?? "").trim();
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(exported)) return true;
  const status = String(row[14] ?? "").trim().toUpperCase();
  return status === "OK" || status === "CEK";
}

async function resolveSheetGridId(
  sheets: ReturnType<typeof google.sheets>,
  spreadsheetId: string,
  sheetTab: string
): Promise<number> {
  const meta = await sheets.spreadsheets.get({
    spreadsheetId,
    fields: "sheets.properties(sheetId,title)",
  });
  const match = meta.data.sheets?.find((s) => s.properties?.title === sheetTab);
  const sheetId = match?.properties?.sheetId;
  if (sheetId == null) throw new Error(`Tab sheet tidak ditemukan: ${sheetTab}`);
  return sheetId;
}

/** Sisipkan baris header jika sheet sudah berisi data tanpa header (row 1 langsung ekspor OCR). */
export async function ensureOcrSheetHeaders(config: GoogleExportConfig): Promise<void> {
  const auth = createGoogleAuthClient(config);
  const sheets = google.sheets({ version: "v4", auth });
  const sheetTab = await resolveSheetTabName(config);
  const sheetId = await resolveSheetGridId(sheets, config.sheetId, sheetTab);

  const head = await sheets.spreadsheets.values.get({
    spreadsheetId: config.sheetId,
    range: `${sheetTab}!A1:O1`,
  });
  const first = head.data.values?.[0];
  if (firstRowIsOcrHeader(first)) return;

  const hasContent = (first ?? []).some((c) => String(c ?? "").trim() !== "");
  if (hasContent && (firstRowLooksLikeOcrData(first) || first)) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: config.sheetId,
      requestBody: {
        requests: [
          {
            insertDimension: {
              range: { sheetId, dimension: "ROWS", startIndex: 0, endIndex: 1 },
              inheritFromBefore: false,
            },
          },
        ],
      },
    });
  }

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: config.sheetId,
    requestBody: {
      requests: [
        {
          updateSheetProperties: {
            properties: { sheetId, gridProperties: { frozenRowCount: 1 } },
            fields: "gridProperties.frozenRowCount",
          },
        },
      ],
    },
  });

  await sheets.spreadsheets.values.update({
    spreadsheetId: config.sheetId,
    range: `${sheetTab}!A1:O1`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [Array.from(OCR_SHEET_HEADERS)] },
  });
}

export async function resolveSheetTabName(config: GoogleExportConfig): Promise<string> {
  const auth = createGoogleAuthClient(config);
  const sheets = google.sheets({ version: "v4", auth });
  const meta = await sheets.spreadsheets.get({
    spreadsheetId: config.sheetId,
    fields: "sheets.properties.title",
  });
  const titles = meta.data.sheets?.map((s) => s.properties?.title).filter(Boolean) as string[];
  if (titles.includes(config.sheetTab)) return config.sheetTab;
  if (titles[0]) return titles[0];
  return config.sheetTab;
}

export async function appendRowsToSheet(params: {
  config: GoogleExportConfig;
  rows: string[][];
}): Promise<{ updatedRange?: string; sheetTab: string }> {
  if (params.rows.length === 0) return { sheetTab: params.config.sheetTab };

  const auth = createGoogleAuthClient(params.config);
  const sheets = google.sheets({ version: "v4", auth });
  const sheetTab = await resolveSheetTabName(params.config);

  await ensureOcrSheetHeaders(params.config);

  const existing = await sheets.spreadsheets.values.get({
    spreadsheetId: params.config.sheetId,
    range: `${sheetTab}!A:O`,
  });
  const startRow = nextOcrDataRowNumber(existing.data.values ?? []);
  const endRow = startRow + params.rows.length - 1;
  const range = `${sheetTab}!A${startRow}:O${endRow}`;

  const res = await sheets.spreadsheets.values.update({
    spreadsheetId: params.config.sheetId,
    range,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: params.rows },
  });

  return { updatedRange: res.data.updatedRange ?? undefined, sheetTab };
}

function bufferToStream(buffer: Buffer) {
  return Readable.from(buffer);
}
