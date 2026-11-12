import { Readable } from "node:stream";
import { google } from "googleapis";
import type { GoogleExportConfig } from "./config";
import { createDriveOAuthClient, isDriveOAuthConfigured } from "./drive-oauth";
import {
  nextOcrDataRowNumber,
  OCR_SHEET_HEADERS,
  OCR_SHEET_LEGACY_HEADER,
} from "./google-sj-export-rows";
import {
  OCR_SHEET_RANGE_COL,
  ocrSheetFullColumnsRange,
  ocrSheetRowRange,
} from "./ocr-sheet-columns";
import { isTabSetupCached, markTabSetupCached, tabSetupCacheKey } from "@/lib/google-sheets/tab-setup-cache";
import { SHEET_QUOTA_USER_MESSAGE, sheetQuotaError } from "@/lib/google-sheets/sheet-values";
import { applyOcrSheetFormatting } from "./ocr-sheet-format";
import { ensureInboundMonitoringWorkbook } from "./inbound-monitoring-layout";
import { DATA_COMPILATION_TAB_NAME } from "@/lib/config/ocr-export-target";

const resolvedOcrTabBySpreadsheet = new Map<string, string>();

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

/**
 * Google Sheets — pakai service account langsung (sheet dishare Editor ke client_email).
 * Jangan pakai `subject` / GOOGLE_WORKSPACE_DELEGATED_USER (delegation hanya Workspace, bukan @gmail.com).
 */
export function createGoogleSheetsAuthClient(config: GoogleExportConfig) {
  return new google.auth.JWT({
    email: config.credentials.client_email,
    key: config.credentials.private_key,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
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
  folderId?: string;
}): Promise<{ fileId: string; fileUrl: string }> {
  const payload = {
    folderId: params.folderId?.trim() || params.config.driveFolderId,
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

function firstRowIsCurrentOcrHeader(row: string[] | undefined): boolean {
  if (!row?.length) return false;
  if (row.length < OCR_SHEET_HEADERS.length) return false;
  for (let i = 0; i < OCR_SHEET_HEADERS.length; i += 1) {
    if (String(row[i] ?? "").trim() !== OCR_SHEET_HEADERS[i]) return false;
  }
  return true;
}

function firstRowLooksLikeOcrData(row: string[] | undefined): boolean {
  if (!row?.length) return false;
  const exported = String(row[1] ?? row[0] ?? "").trim();
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(exported)) return true;
  const status = String(row[18] ?? row[17] ?? row[14] ?? "").trim().toUpperCase();
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

/**
 * Pastikan baris header OCR ada. Sengaja ringan untuk upload — tidak rebuild tab Summary/monitoring
 * (itu `npm run sheet:monitoring` saja; rebuild tiap foto memicu kuota 60 writes/menit).
 */
export async function ensureOcrSheetHeaders(config: GoogleExportConfig): Promise<void> {
  const headerCacheKey = tabSetupCacheKey(config.sheetId, config.sheetTab, "ocr-header-ok");
  if (isTabSetupCached(headerCacheKey)) return;

  const auth = createGoogleAuthClient(config);
  const sheets = google.sheets({ version: "v4", auth });
  const sheetTab = await resolveSheetTabName(config);
  const sheetId = await resolveSheetGridId(sheets, config.sheetId, sheetTab);

  const head = await sheets.spreadsheets.values.get({
    spreadsheetId: config.sheetId,
    range: `${sheetTab}!A1:${OCR_SHEET_RANGE_COL}1`,
  });
  const first = head.data.values?.[0];
  const headerOk = firstRowIsCurrentOcrHeader(first);

  if (headerOk) {
    markTabSetupCached(headerCacheKey);
    return;
  }

  const hasContent = (first ?? []).some((c) => String(c ?? "").trim() !== "");
  if (
    hasContent &&
    (firstRowLooksLikeOcrData(first) || String(first?.[0] ?? "").trim() === OCR_SHEET_LEGACY_HEADER)
  ) {
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

  await sheets.spreadsheets.values.update({
    spreadsheetId: config.sheetId,
    range: `${sheetTab}!A1:${OCR_SHEET_RANGE_COL}1`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [Array.from(OCR_SHEET_HEADERS)] },
  });

  const formatKey = tabSetupCacheKey(config.sheetId, sheetTab, "ocr-format");
  if (!isTabSetupCached(formatKey)) {
    await applyOcrSheetFormatting(sheets, config.sheetId, sheetId);
    markTabSetupCached(formatKey);
  }

  markTabSetupCached(headerCacheKey);

  if (process.env.GOOGLE_SHEET_MONITORING_ON_UPLOAD === "true") {
    try {
      await ensureInboundMonitoringWorkbook(config, sheets);
    } catch (err) {
      console.warn("ensureInboundMonitoringWorkbook:", err);
    }
  }
}

export async function resolveSheetTabName(config: GoogleExportConfig): Promise<string> {
  const cached = resolvedOcrTabBySpreadsheet.get(config.sheetId);
  if (cached) return cached;

  const auth = createGoogleAuthClient(config);
  const sheets = google.sheets({ version: "v4", auth });
  const meta = await sheets.spreadsheets.get({
    spreadsheetId: config.sheetId,
    fields: "sheets.properties.title",
  });
  const titles = meta.data.sheets?.map((s) => s.properties?.title).filter(Boolean) as string[];
  let tab = config.sheetTab;
  if (titles.includes(config.sheetTab)) tab = config.sheetTab;
  else if (titles.includes(DATA_COMPILATION_TAB_NAME)) tab = DATA_COMPILATION_TAB_NAME;
  else if (titles.includes("Sheet1")) tab = "Sheet1";
  else if (titles[0]) tab = titles[0];
  resolvedOcrTabBySpreadsheet.set(config.sheetId, tab);
  return tab;
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
    range: ocrSheetFullColumnsRange(sheetTab),
  });
  const startRow = nextOcrDataRowNumber(existing.data.values ?? []);
  const endRow = startRow + params.rows.length - 1;
  const range = ocrSheetRowRange(sheetTab, startRow, endRow);

  try {
    const res = await sheets.spreadsheets.values.update({
      spreadsheetId: params.config.sheetId,
      range,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: params.rows },
    });
    return { updatedRange: res.data.updatedRange ?? undefined, sheetTab };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (sheetQuotaError(message)) {
      throw new Error(
        `${SHEET_QUOTA_USER_MESSAGE} Upload foto hanya perlu 1–2 tulis ke sheet; hindari upload banyak file sekaligus atau tunggu 1 menit. Jalankan \`npm run sheet:monitoring\` terpisah (bukan saat upload).`
      );
    }
    throw err;
  }
}

function bufferToStream(buffer: Buffer) {
  return Readable.from(buffer);
}

export function parseDriveFileId(fileUrl: string): string | null {
  const trimmed = fileUrl.trim();
  if (!trimmed) return null;
  const m =
    trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) ??
    trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  return m?.[1] ?? null;
}

async function createDriveAuthForWrite(config: GoogleExportConfig) {
  if (preferOAuthDriveUpload()) {
    const oauth = createDriveOAuthClient();
    if (oauth) return oauth;
  }
  const jwt = createGoogleAuthClient(config);
  try {
    await jwt.authorize();
    return jwt;
  } catch {
    const oauth = createDriveOAuthClient();
    if (oauth) return oauth;
    return jwt;
  }
}

async function listChildren(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  drive: any,
  parentId: string,
  mimeTypeFilter?: "folder" | "file"
): Promise<Array<{ id: string; name: string; mimeType: string }>> {
  const items: Array<{ id: string; name: string; mimeType: string }> = [];
  let pageToken: string | undefined;
  do {
    const res = await drive.files.list({
      q: `'${parentId}' in parents and trashed = false`,
      fields: "nextPageToken,files(id,name,mimeType)",
      pageSize: 200,
      pageToken,
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    });
    for (const f of res.data.files ?? []) {
      if (!f.id || !f.name) continue;
      const mime = f.mimeType || "";
      if (mimeTypeFilter === "folder" && mime !== "application/vnd.google-apps.folder") continue;
      if (mimeTypeFilter === "file" && mime === "application/vnd.google-apps.folder") continue;
      items.push({ id: f.id, name: f.name, mimeType: mime });
    }
    pageToken = res.data.nextPageToken ?? undefined;
  } while (pageToken);
  return items;
}

export async function findOrCreateDriveFolder(params: {
  config: GoogleExportConfig;
  parentId: string;
  folderName: string;
}): Promise<string> {
  const name = params.folderName.trim();
  if (!name) throw new Error("Nama folder Drive kosong");

  const auth = await createDriveAuthForWrite(params.config);
  const drive = google.drive({ version: "v3", auth });

  const children = await listChildren(drive, params.parentId, "folder");
  const existing = children.find((c) => c.name === name);
  if (existing) return existing.id;

  const res = await drive.files.create({
    requestBody: {
      name,
      mimeType: "application/vnd.google-apps.folder",
      parents: [params.parentId],
    },
    fields: "id",
    supportsAllDrives: true,
    enforceSingleParent: true,
  });
  const id = res.data.id;
  if (!id) throw new Error(`Gagal membuat folder Drive: ${name}`);
  return id;
}

/** `…/Gudang X/[tanggal] - no - supplier/` lalu unggah file di dalamnya. */
export async function uploadSuratJalanToGudangDrive(params: {
  config: GoogleExportConfig;
  buffer: Buffer;
  fileName: string;
  mimeType: string;
  gudang: string;
  subfolderName: string;
  /** Root folder (GBC atau folder supplier) — default `config.driveFolderId`. */
  rootFolderId?: string;
}): Promise<{ fileId: string; fileUrl: string }> {
  const rootId = params.rootFolderId?.trim() || params.config.driveFolderId;
  const gudangFolderId = await findOrCreateDriveFolder({
    config: params.config,
    parentId: rootId,
    folderName: params.gudang.trim(),
  });
  const batchFolderId = await findOrCreateDriveFolder({
    config: params.config,
    parentId: gudangFolderId,
    folderName: params.subfolderName.trim(),
  });
  return uploadFileToDrive({
    config: params.config,
    buffer: params.buffer,
    fileName: params.fileName,
    mimeType: params.mimeType,
    folderId: batchFolderId,
  });
}

async function createDriveAuthForRead(config: GoogleExportConfig) {
  if (preferOAuthDriveUpload()) {
    const oauth = createDriveOAuthClient();
    if (oauth) return oauth;
  }
  const jwt = createGoogleAuthClient(config);
  try {
    await jwt.authorize();
    return jwt;
  } catch {
    const oauth = createDriveOAuthClient();
    if (oauth) return oauth;
    return jwt;
  }
}

export async function findDriveFileInFolder(params: {
  config: GoogleExportConfig;
  fileName: string;
}): Promise<{ fileId: string; mimeType: string } | null> {
  const name = params.fileName.trim();
  if (!name) return null;
  const auth = await createDriveAuthForRead(params.config);
  const drive = google.drive({ version: "v3", auth });
  const root = params.config.driveFolderId;
  const queue = [root];
  const seen = new Set<string>();

  while (queue.length > 0) {
    const folderId = queue.shift()!;
    if (seen.has(folderId)) continue;
    seen.add(folderId);

    const children = await listChildren(drive, folderId);
    for (const child of children) {
      if (child.mimeType === "application/vnd.google-apps.folder") {
        queue.push(child.id);
        continue;
      }
      if (child.name === name) {
        return { fileId: child.id, mimeType: child.mimeType || "image/jpeg" };
      }
    }
  }
  return null;
}

export async function downloadDriveFile(params: {
  config: GoogleExportConfig;
  fileId: string;
}): Promise<{ buffer: Buffer; mimeType: string }> {
  const auth = await createDriveAuthForRead(params.config);
  const drive = google.drive({ version: "v3", auth });
  const meta = await drive.files.get({
    fileId: params.fileId,
    fields: "mimeType",
    supportsAllDrives: true,
  });
  const mimeType = meta.data.mimeType || "application/octet-stream";
  const media = await drive.files.get(
    { fileId: params.fileId, alt: "media", supportsAllDrives: true },
    { responseType: "arraybuffer" }
  );
  return { buffer: Buffer.from(media.data as ArrayBuffer), mimeType };
}

export async function resolveAndDownloadSuratJalanImage(params: {
  config: GoogleExportConfig;
  fileUrl: string;
  fileName: string;
}): Promise<{ buffer: Buffer; mimeType: string; fileId: string }> {
  let fileId = parseDriveFileId(params.fileUrl);
  let mimeType = "image/jpeg";
  if (!fileId && params.fileName) {
    const found = await findDriveFileInFolder({ config: params.config, fileName: params.fileName });
    if (!found) {
      throw new Error(`File tidak ditemukan di Drive: ${params.fileName}`);
    }
    fileId = found.fileId;
    mimeType = found.mimeType;
  }
  if (!fileId) {
    throw new Error("Tidak ada link Drive atau nama file untuk foto Surat Jalan");
  }
  const downloaded = await downloadDriveFile({ config: params.config, fileId });
  return { ...downloaded, fileId };
}
