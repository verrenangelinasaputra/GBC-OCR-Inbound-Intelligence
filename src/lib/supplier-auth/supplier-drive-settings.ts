import { google } from "googleapis";
import { loadServiceAccountCredentials } from "@/lib/providers/google-workspace/config";
import { SupplierAuthError } from "./errors";
import { supplierMasterUsername } from "./master-admin";

const DRIVE_TAB = () => process.env.SUPPLIER_DRIVE_TAB?.trim() || "SupplierDrive";

const DRIVE_HEADERS = [
  "username",
  "drive_root_folder_id",
  "drive_root_folder_url",
  "mirror_enabled",
  "path_locked",
  "updated_at",
  "updated_by",
] as const;

export type SupplierDriveSettings = {
  rowNumber: number;
  username: string;
  driveRootFolderId: string;
  driveRootFolderUrl: string;
  mirrorEnabled: boolean;
  pathLocked: boolean;
  updatedAt: string;
  updatedBy: string;
};

function sheetTarget() {
  const creds = loadServiceAccountCredentials();
  if (!creds) {
    throw new SupplierAuthError(
      "Service account Google belum diatur. Isi GOOGLE_SERVICE_ACCOUNT_JSON.",
      500
    );
  }
  const defaultSheet = process.env.SUPPLIER_SHEET_ID?.trim() || "156m4HFAUnqubtCJumBJZ9BCCel_kNVcU_ZV9kHi4HtY";
  const auth = new google.auth.JWT({
    email: creds.client_email,
    key: creds.private_key,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  return { sheets: google.sheets({ version: "v4", auth }), sheetId: defaultSheet };
}

function a1(tab: string, cells: string): string {
  return `'${tab.replace(/'/g, "''")}'!${cells}`;
}

function timestampJakarta(date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")} ${get("hour")}:${get("minute")}:${get("second")}`;
}

async function ensureDriveTab(): Promise<void> {
  const { sheets, sheetId } = sheetTarget();
  const tab = DRIVE_TAB();
  const meta = await sheets.spreadsheets.get({
    spreadsheetId: sheetId,
    fields: "sheets.properties.title",
  });
  const exists = meta.data.sheets?.some((s) => s.properties?.title === tab);
  if (!exists) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: sheetId,
      requestBody: { requests: [{ addSheet: { properties: { title: tab } } }] },
    });
  }
  const head = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: a1(tab, "1:1"),
  });
  const first = String(head.data.values?.[0]?.[0] ?? "").trim().toLowerCase();
  if (first === DRIVE_HEADERS[0]) return;
  if (first) {
    throw new SupplierAuthError(`Baris 1 tab ${tab} harus kosong atau header "${DRIVE_HEADERS[0]}".`, 500);
  }
  await sheets.spreadsheets.values.update({
    spreadsheetId: sheetId,
    range: a1(tab, "A1"),
    valueInputOption: "RAW",
    requestBody: { values: [Array.from(DRIVE_HEADERS)] },
  });
}

async function readDriveRows(): Promise<string[][]> {
  await ensureDriveTab();
  const { sheets, sheetId } = sheetTarget();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: a1(DRIVE_TAB(), "A:G"),
  });
  return (res.data.values ?? []).map((row) => row.map((cell) => String(cell ?? "")));
}

function rowToSettings(row: string[], rowNumber: number): SupplierDriveSettings {
  return {
    rowNumber,
    username: String(row[0] ?? "").trim().toLowerCase(),
    driveRootFolderId: String(row[1] ?? "").trim(),
    driveRootFolderUrl: String(row[2] ?? "").trim(),
    mirrorEnabled: String(row[3] ?? "").toLowerCase() === "true",
    pathLocked: String(row[4] ?? "").toLowerCase() === "true",
    updatedAt: row[5] ?? "",
    updatedBy: row[6] ?? "",
  };
}

/** Ambil folder ID dari URL Drive atau string ID mentah. */
export function parseDriveFolderId(urlOrId: string): string | null {
  const raw = urlOrId.trim();
  if (!raw) return null;
  const folderMatch = raw.match(/\/folders\/([a-zA-Z0-9_-]+)/);
  if (folderMatch?.[1]) return folderMatch[1];
  const idParam = raw.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (idParam?.[1]) return idParam[1];
  if (/^[a-zA-Z0-9_-]{10,}$/.test(raw)) return raw;
  return null;
}

export async function listSupplierDriveSettings(): Promise<SupplierDriveSettings[]> {
  const rows = await readDriveRows();
  const out: SupplierDriveSettings[] = [];
  for (let i = 1; i < rows.length; i += 1) {
    const username = String(rows[i]?.[0] ?? "").trim().toLowerCase();
    if (!username || username === supplierMasterUsername()) continue;
    out.push(rowToSettings(rows[i] ?? [], i + 1));
  }
  return out;
}

export async function getSupplierDriveSettings(username: string): Promise<SupplierDriveSettings | null> {
  const key = username.trim().toLowerCase();
  if (!key) return null;
  const rows = await readDriveRows();
  for (let i = 1; i < rows.length; i += 1) {
    if (String(rows[i]?.[0] ?? "").trim().toLowerCase() !== key) continue;
    return rowToSettings(rows[i] ?? [], i + 1);
  }
  return null;
}

export type UpsertSupplierDriveInput = {
  username: string;
  driveRootFolderUrl?: string;
  driveRootFolderId?: string;
  mirrorEnabled?: boolean;
  pathLocked?: boolean;
  updatedBy: string;
};

export async function upsertSupplierDriveSettings(input: UpsertSupplierDriveInput): Promise<SupplierDriveSettings> {
  const username = input.username.trim().toLowerCase();
  if (!username) throw new SupplierAuthError("Username wajib diisi.");
  if (username === supplierMasterUsername()) {
    throw new SupplierAuthError("Tidak bisa mengatur Drive untuk akun master admin.");
  }

  const folderId =
    input.driveRootFolderId?.trim() ||
    (input.driveRootFolderUrl ? parseDriveFolderId(input.driveRootFolderUrl) : null) ||
    "";
  const folderUrl = input.driveRootFolderUrl?.trim() || (folderId ? `https://drive.google.com/drive/folders/${folderId}` : "");

  if (input.mirrorEnabled && !folderId) {
    throw new SupplierAuthError("Mirror aktif butuh folder Drive valid (URL atau ID).");
  }

  const rows = await readDriveRows();
  const now = timestampJakarta();
  const mirror = input.mirrorEnabled ?? false;
  const locked = input.pathLocked ?? false;
  const line = [username, folderId, folderUrl, String(mirror), String(locked), now, input.updatedBy];

  let rowNumber = -1;
  for (let i = 1; i < rows.length; i += 1) {
    if (String(rows[i]?.[0] ?? "").trim().toLowerCase() === username) {
      rowNumber = i + 1;
      rows[i] = line;
      break;
    }
  }
  if (rowNumber < 0) {
    rows.push(line);
    rowNumber = rows.length;
  }

  const { sheets, sheetId } = sheetTarget();
  const tab = DRIVE_TAB();
  const header = rows[0]?.length ? rows[0] : Array.from(DRIVE_HEADERS);
  const body = [header, ...rows.slice(1)];
  await sheets.spreadsheets.values.clear({ spreadsheetId: sheetId, range: a1(tab, "A:G") });
  await sheets.spreadsheets.values.update({
    spreadsheetId: sheetId,
    range: a1(tab, "A1"),
    valueInputOption: "RAW",
    requestBody: { values: body },
  });

  return rowToSettings(line, rowNumber);
}
