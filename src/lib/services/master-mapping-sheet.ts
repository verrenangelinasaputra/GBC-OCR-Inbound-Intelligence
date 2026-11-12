import "server-only";

import { google } from "googleapis";
import { createGoogleSheetsAuthClient } from "@/lib/providers/google-workspace/client";
import { getGoogleExportConfigOptional } from "@/lib/providers/google-workspace/config";
import {
  getMasterMappingTabName,
  getSkuRekapSheetId,
} from "@/lib/config/sku-mapping-sheets";
import type { MasterMappingEntry } from "@/lib/sku-matching/master-mapping-types";
import { googleConfigForSpreadsheet } from "@/lib/services/sku-rekap-catalog";

export const MASTER_MAPPING_HEADERS = [
  "Nama Barang OCR",
  "SKU Lengkap",
  "Nama Internal Accurate",
  "Nama Produk Acuan",
  "Kategori Utama",
  "SKUS",
  "Barcode",
  "Sumber Lembar",
  "Ditambah Oleh",
  "Ditambah Pada",
] as const;

const CACHE_MS = 5 * 60 * 1000;
let cache: { at: number; entries: MasterMappingEntry[] } | null = null;

function quoteTab(tab: string): string {
  return `'${tab.replace(/'/g, "''")}'`;
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

function rowToEntry(row: string[], sheetRow: number): MasterMappingEntry | null {
  const namaBarangOcr = String(row[0] ?? "").trim();
  const skuLengkap = String(row[1] ?? "").trim();
  const namaProdukAcuan = String(row[3] ?? "").trim();
  if (!namaBarangOcr || (!skuLengkap && !namaProdukAcuan)) return null;
  return {
    rowNo: `MM-${sheetRow}`,
    namaBarangOcr,
    skuLengkap,
    namaInternalAccurate: String(row[2] ?? "").trim(),
    namaProdukAcuan,
    kategoriUtama: String(row[4] ?? "").trim(),
    skus: String(row[5] ?? "").trim(),
    barcode: String(row[6] ?? "").trim(),
    sumberLembar: String(row[7] ?? "").trim() || "Master Mapping",
    addedBy: String(row[8] ?? "").trim(),
    addedAt: String(row[9] ?? "").trim(),
  };
}

async function ensureMasterMappingTab(sheets: ReturnType<typeof google.sheets>, spreadsheetId: string, tab: string) {
  const meta = await sheets.spreadsheets.get({ spreadsheetId, fields: "sheets.properties" });
  const exists = meta.data.sheets?.some((s) => s.properties?.title === tab);
  if (exists) return;
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [{ addSheet: { properties: { title: tab } } }],
    },
  });
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${quoteTab(tab)}!A1:J1`,
    valueInputOption: "RAW",
    requestBody: { values: [Array.from(MASTER_MAPPING_HEADERS)] },
  });
}

export function invalidateMasterMappingCache(): void {
  cache = null;
}

export async function loadMasterMappingEntries(force = false): Promise<MasterMappingEntry[]> {
  const now = Date.now();
  if (!force && cache && now - cache.at < CACHE_MS) return cache.entries;

  const base = getGoogleExportConfigOptional();
  if (!base) return [];

  const spreadsheetId = getSkuRekapSheetId();
  const tab = getMasterMappingTabName();
  const auth = createGoogleSheetsAuthClient(googleConfigForSpreadsheet(spreadsheetId) ?? base);
  const sheets = google.sheets({ version: "v4", auth });

  await ensureMasterMappingTab(sheets, spreadsheetId, tab);

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${quoteTab(tab)}!A:J`,
  });

  const rows = res.data.values ?? [];
  const entries: MasterMappingEntry[] = [];
  for (let i = 1; i < rows.length; i += 1) {
    const parsed = rowToEntry(rows[i] ?? [], i + 1);
    if (parsed) entries.push(parsed);
  }

  cache = { at: now, entries };
  return entries;
}

export async function appendMasterMappingEntry(
  input: Omit<MasterMappingEntry, "rowNo" | "addedAt" | "addedBy" | "sumberLembar"> & {
    addedBy: string;
  }
): Promise<MasterMappingEntry> {
  const base = getGoogleExportConfigOptional();
  if (!base) throw new Error("Google export tidak dikonfigurasi");

  const spreadsheetId = getSkuRekapSheetId();
  const tab = getMasterMappingTabName();
  const auth = createGoogleSheetsAuthClient(googleConfigForSpreadsheet(spreadsheetId) ?? base);
  const sheets = google.sheets({ version: "v4", auth });
  await ensureMasterMappingTab(sheets, spreadsheetId, tab);

  const addedAt = timestampJakarta();
  const row = [
    input.namaBarangOcr.trim(),
    input.skuLengkap.trim(),
    input.namaInternalAccurate.trim(),
    input.namaProdukAcuan.trim(),
    input.kategoriUtama.trim(),
    input.skus.trim(),
    input.barcode.trim(),
    "Master Mapping",
    input.addedBy.trim(),
    addedAt,
  ];

  const appendRes = await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `${quoteTab(tab)}!A:J`,
    valueInputOption: "RAW",
    insertDataOption: "INSERT_ROWS",
    requestBody: { values: [row] },
  });

  const updatedRange = appendRes.data.updates?.updatedRange ?? "";
  const rowMatch = /!A(\d+)/i.exec(updatedRange);
  const sheetRow = rowMatch ? Number(rowMatch[1]) : 0;

  invalidateMasterMappingCache();

  return {
    rowNo: sheetRow ? `MM-${sheetRow}` : `MM-${Date.now()}`,
    namaBarangOcr: input.namaBarangOcr.trim(),
    skuLengkap: input.skuLengkap.trim(),
    namaInternalAccurate: input.namaInternalAccurate.trim(),
    namaProdukAcuan: input.namaProdukAcuan.trim(),
    kategoriUtama: input.kategoriUtama.trim(),
    skus: input.skus.trim(),
    barcode: input.barcode.trim(),
    sumberLembar: "Master Mapping",
    addedBy: input.addedBy.trim(),
    addedAt,
  };
}
