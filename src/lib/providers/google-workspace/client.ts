import { Readable } from "node:stream";
import { google } from "googleapis";
import type { GoogleExportConfig } from "./config";

function driveScopes(config: GoogleExportConfig): string[] {
  if (config.impersonateUserEmail) {
    return ["https://www.googleapis.com/auth/drive", "https://www.googleapis.com/auth/spreadsheets"];
  }
  return [
    "https://www.googleapis.com/auth/drive.file",
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
  });

  const fileId = res.data.id;
  if (!fileId) throw new Error("Drive upload tidak mengembalikan file ID");

  return {
    fileId,
    fileUrl: `https://drive.google.com/file/d/${fileId}/view?usp=drivesdk`,
  };
}

export async function appendRowsToSheet(params: {
  config: GoogleExportConfig;
  rows: string[][];
}): Promise<void> {
  if (params.rows.length === 0) return;

  const auth = createGoogleAuthClient(params.config);
  const sheets = google.sheets({ version: "v4", auth });
  const range = `${params.config.sheetTab}!A:O`;

  await sheets.spreadsheets.values.append({
    spreadsheetId: params.config.sheetId,
    range,
    valueInputOption: "USER_ENTERED",
    insertDataOption: "INSERT_ROWS",
    requestBody: {
      values: params.rows,
    },
  });
}

function bufferToStream(buffer: Buffer) {
  return Readable.from(buffer);
}
