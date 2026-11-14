import "server-only";

import { google } from "googleapis";
import { createGoogleSheetsAuthClient } from "@/lib/providers/google-workspace/client";
import { getGoogleExportConfigOptional } from "@/lib/providers/google-workspace/config";
import {
  getSupplierMasterDataSheetId,
  getSupplierMasterDataTabName,
  SUPPLIER_MASTER_DATA_HEADERS,
} from "@/lib/config/supplier-master-data-sheet";
import type { SupplierMasterDataInput, SupplierMasterDataRow } from "@/lib/supplier-mapping/types";

const CACHE_MS = 5 * 60 * 1000;
let cache: { at: number; rows: SupplierMasterDataRow[] } | null = null;

function quoteTab(tab: string): string {
  return `'${tab.replace(/'/g, "''")}'`;
}

function rowToEntry(row: string[], sheetRow: number): SupplierMasterDataRow | null {
  const tipeSupplier = String(row[0] ?? "").trim();
  const kode = String(row[1] ?? "").trim();
  const namaSupplier = String(row[2] ?? "").trim();
  if (!kode && !namaSupplier) return null;
  return { sheetRow, tipeSupplier, kode, namaSupplier };
}

function entryToValues(input: SupplierMasterDataInput): string[] {
  return [input.tipeSupplier.trim(), input.kode.trim(), input.namaSupplier.trim()];
}

async function getSheets() {
  const base = getGoogleExportConfigOptional();
  if (!base) throw new Error("Google export tidak dikonfigurasi");
  const auth = createGoogleSheetsAuthClient({
    ...base,
    sheetId: getSupplierMasterDataSheetId(),
  });
  return {
    sheets: google.sheets({ version: "v4", auth }),
    spreadsheetId: getSupplierMasterDataSheetId(),
    tab: getSupplierMasterDataTabName(),
  };
}

async function ensureHeader(sheets: ReturnType<typeof google.sheets>, spreadsheetId: string, tab: string) {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${quoteTab(tab)}!A1:C1`,
  });
  const first = res.data.values?.[0]?.[0] ?? "";
  if (String(first).trim() !== SUPPLIER_MASTER_DATA_HEADERS[0]) {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${quoteTab(tab)}!A1`,
      valueInputOption: "RAW",
      requestBody: { values: [Array.from(SUPPLIER_MASTER_DATA_HEADERS)] },
    });
  }
}

export function invalidateSupplierMasterDataCache(): void {
  cache = null;
}

export async function loadSupplierMasterDataRows(force = false): Promise<SupplierMasterDataRow[]> {
  const now = Date.now();
  if (!force && cache && now - cache.at < CACHE_MS) return cache.rows;

  const base = getGoogleExportConfigOptional();
  if (!base) return [];

  const { sheets, spreadsheetId, tab } = await getSheets();
  await ensureHeader(sheets, spreadsheetId, tab);

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${quoteTab(tab)}!A:C`,
  });

  const matrix = res.data.values ?? [];
  const rows: SupplierMasterDataRow[] = [];
  for (let i = 1; i < matrix.length; i += 1) {
    const parsed = rowToEntry(matrix[i] ?? [], i + 1);
    if (parsed) rows.push(parsed);
  }

  cache = { at: now, rows };
  return rows;
}

async function writeBodyRows(rows: SupplierMasterDataRow[]) {
  const { sheets, spreadsheetId, tab } = await getSheets();
  const values = rows.map((r) => entryToValues(r));
  const range = `${quoteTab(tab)}!A2:C${Math.max(2, values.length + 1)}`;
  await sheets.spreadsheets.values.clear({
    spreadsheetId,
    range: `${quoteTab(tab)}!A2:C`,
  });
  if (values.length) {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range,
      valueInputOption: "USER_ENTERED",
      requestBody: { values },
    });
  }
  invalidateSupplierMasterDataCache();
  return loadSupplierMasterDataRows(true);
}

export async function appendSupplierMasterDataRow(
  input: SupplierMasterDataInput
): Promise<SupplierMasterDataRow> {
  if (!input.kode.trim() || !input.namaSupplier.trim()) {
    throw new Error("Kode dan Nama Supplier wajib");
  }
  const { sheets, spreadsheetId, tab } = await getSheets();
  await ensureHeader(sheets, spreadsheetId, tab);
  const appendRes = await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `${quoteTab(tab)}!A:C`,
    valueInputOption: "USER_ENTERED",
    insertDataOption: "INSERT_ROWS",
    requestBody: { values: [entryToValues(input)] },
  });
  invalidateSupplierMasterDataCache();
  const updatedRange = appendRes.data.updates?.updatedRange ?? "";
  const rowMatch = /!A(\d+)/i.exec(updatedRange);
  const sheetRow = rowMatch ? Number(rowMatch[1]) : 0;
  return {
    sheetRow: sheetRow || 0,
    tipeSupplier: input.tipeSupplier.trim(),
    kode: input.kode.trim(),
    namaSupplier: input.namaSupplier.trim(),
  };
}

export async function updateSupplierMasterDataRow(
  sheetRow: number,
  input: SupplierMasterDataInput
): Promise<SupplierMasterDataRow> {
  if (sheetRow < 2) throw new Error("Baris tidak valid");
  if (!input.kode.trim() || !input.namaSupplier.trim()) {
    throw new Error("Kode dan Nama Supplier wajib");
  }
  const { sheets, spreadsheetId, tab } = await getSheets();
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${quoteTab(tab)}!A${sheetRow}:C${sheetRow}`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [entryToValues(input)] },
  });
  invalidateSupplierMasterDataCache();
  return {
    sheetRow,
    tipeSupplier: input.tipeSupplier.trim(),
    kode: input.kode.trim(),
    namaSupplier: input.namaSupplier.trim(),
  };
}

export async function deleteSupplierMasterDataRow(sheetRow: number): Promise<SupplierMasterDataRow[]> {
  if (sheetRow < 2) throw new Error("Baris tidak valid");
  const rows = await loadSupplierMasterDataRows(true);
  const next = rows.filter((r) => r.sheetRow !== sheetRow);
  if (next.length === rows.length) throw new Error("Baris tidak ditemukan");
  return writeBodyRows(next);
}
