import { Readable } from "node:stream";
import { google } from "googleapis";
import type { GoogleExportConfig } from "./config";

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

export async function uploadFileToDrive(params: {
  config: GoogleExportConfig;
  buffer: Buffer;
  fileName: string;
  mimeType: string;
}): Promise<{ fileId: string; fileUrl: string }> {
  const auth = createGoogleAuthClient(params.config);
  const drive = google.drive({ version: "v3", auth });

  const res = await drive.files.create({
    requestBody: {
      name: params.fileName,
      parents: [params.config.driveFolderId],
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
  const range = `${sheetTab}!A:O`;

  const res = await sheets.spreadsheets.values.append({
    spreadsheetId: params.config.sheetId,
    range,
    valueInputOption: "USER_ENTERED",
    insertDataOption: "INSERT_ROWS",
    requestBody: {
      values: params.rows,
    },
  });

  return { updatedRange: res.data.updates?.updatedRange ?? undefined, sheetTab };
}

function bufferToStream(buffer: Buffer) {
  return Readable.from(buffer);
}
