import "server-only";

import { google } from "googleapis";
import { createGoogleSheetsAuthClient } from "@/lib/providers/google-workspace/client";
import { getGoogleExportConfigOptional, type GoogleExportConfig } from "@/lib/providers/google-workspace/config";
import { getSkuRekapSheetId, getSkuRekapTabName } from "@/lib/config/sku-mapping-sheets";
import type { SkuRekapEntry } from "@/lib/sku-matching/sku-rekap-types";

const CACHE_MS = 10 * 60 * 1000;
let cache: { at: number; entries: SkuRekapEntry[] } | null = null;

function quoteTab(tab: string): string {
  return `'${tab.replace(/'/g, "''")}'`;
}

function parseRekapRow(row: string[], rowIndex: number): SkuRekapEntry | null {
  const [
    rowNo,
    skuLengkap,
    namaInternalAccurate,
    namaProdukAcuan,
    kategoriUtama,
    skus,
    barcode,
    sumberLembar,
  ] = row.map((c) => String(c ?? "").trim());

  if (!namaProdukAcuan && !skuLengkap) return null;
  return {
    rowNo: rowNo || String(rowIndex),
    skuLengkap,
    namaInternalAccurate,
    namaProdukAcuan,
    kategoriUtama,
    skus,
    barcode,
    sumberLembar,
  };
}

export async function loadSkuRekapCatalog(force = false): Promise<SkuRekapEntry[]> {
  const now = Date.now();
  if (!force && cache && now - cache.at < CACHE_MS) return cache.entries;

  const base = getGoogleExportConfigOptional();
  if (!base) return [];

  const auth = createGoogleSheetsAuthClient(base);
  const sheets = google.sheets({ version: "v4", auth });
  const tab = getSkuRekapTabName();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: getSkuRekapSheetId(),
    range: `${quoteTab(tab)}!A:H`,
  });

  const rows = res.data.values ?? [];
  const entries: SkuRekapEntry[] = [];

  for (let i = 1; i < rows.length; i += 1) {
    const parsed = parseRekapRow(rows[i] ?? [], i + 1);
    if (parsed) entries.push(parsed);
  }

  cache = { at: now, entries };
  return entries;
}

export function getCatalogEntryByRowNo(catalog: SkuRekapEntry[], rowNo: string): SkuRekapEntry | null {
  const key = rowNo.trim();
  return catalog.find((e) => e.rowNo === key || e.skuLengkap === key) ?? null;
}

export function googleConfigForSpreadsheet(spreadsheetId: string): GoogleExportConfig | null {
  const base = getGoogleExportConfigOptional();
  if (!base) return null;
  return { ...base, sheetId: spreadsheetId };
}
