import "server-only";

import { google } from "googleapis";
import { createGoogleSheetsAuthClient } from "@/lib/providers/google-workspace/client";
import { getGoogleExportConfigOptional, type GoogleExportConfig } from "@/lib/providers/google-workspace/config";
import { getSkuRekapSheetId, getSkuRekapTabName } from "@/lib/config/sku-mapping-sheets";
import { coerceSheetCell } from "@/lib/sku-matching/coerce-string";
import {
  parseRekapSkulDataRow,
  rekapSkulColumnMap,
} from "@/lib/sku-matching/rekap-skul-columns";
import type { SkuRekapEntry } from "@/lib/sku-matching/sku-rekap-types";

const CACHE_MS = 10 * 60 * 1000;
let cache: { at: number; entries: SkuRekapEntry[] } | null = null;

export function invalidateSkuRekapCatalogCache(): void {
  cache = null;
}

function quoteTab(tab: string): string {
  return `'${tab.replace(/'/g, "''")}'`;
}

async function mergeGeneratorTableRows(entries: SkuRekapEntry[]): Promise<SkuRekapEntry[]> {
  const bySku = new Map<string, SkuRekapEntry>();
  for (const e of entries) {
    const skuKey = e.skuLengkap.trim().toLowerCase();
    if (skuKey) bySku.set(skuKey, e);
  }

  const { listSkuMasterTableRows } = await import("@/lib/services/sku-master-sheet");
  const { SKU_GENERATOR_CATEGORY_TABS } = await import("@/lib/sku-master/category-tabs");

  for (const tab of SKU_GENERATOR_CATEGORY_TABS) {
    try {
      const tableRows = await listSkuMasterTableRows(tab);
      for (const t of tableRows) {
        const skuKey = t.skuLengkap.trim().toLowerCase();
        if (!skuKey || bySku.has(skuKey)) continue;
        bySku.set(skuKey, {
          rowNo: `T-${tab}-${t.sheetRow}`,
          skuLengkap: coerceSheetCell(t.skuLengkap),
          namaInternalAccurate: coerceSheetCell(t.namaInternalAccurate),
          namaProdukAcuan: coerceSheetCell(t.namaProdukAcuan),
          kategoriUtama: tab,
          skus: coerceSheetCell(t.skus),
          barcode: coerceSheetCell(t.barcode),
          sumberLembar: tab,
        });
      }
    } catch {
      // tab belum ada di spreadsheet
    }
  }

  return [...bySku.values()];
}

export async function loadSkuRekapCatalog(force = false): Promise<SkuRekapEntry[]> {
  const now = Date.now();
  if (!force && cache && now - cache.at < CACHE_MS) return cache.entries;

  const base = getGoogleExportConfigOptional();
  if (!base) return [];

  const spreadsheetId = getSkuRekapSheetId();
  const cfg = googleConfigForSpreadsheet(spreadsheetId) ?? base;
  const auth = createGoogleSheetsAuthClient(cfg);
  const sheets = google.sheets({ version: "v4", auth });
  const tab = getSkuRekapTabName();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${quoteTab(tab)}!A:H`,
  });

  const rows = res.data.values ?? [];
  const header = rows[0] ?? [];
  const cols = rekapSkulColumnMap(header);
  const entries: SkuRekapEntry[] = [];

  for (let i = 1; i < rows.length; i += 1) {
    const parsed = parseRekapSkulDataRow(rows[i] ?? [], i + 1, cols);
    if (parsed) entries.push(parsed);
  }

  const merged = await mergeGeneratorTableRows(entries);
  cache = { at: now, entries: merged };
  return merged;
}

export function getCatalogEntryByRowNo(catalog: SkuRekapEntry[], rowNo: string): SkuRekapEntry | null {
  const key = coerceSheetCell(rowNo);
  return catalog.find((e) => e.rowNo === key || e.skuLengkap === key) ?? null;
}

export function googleConfigForSpreadsheet(spreadsheetId: string): GoogleExportConfig | null {
  const base = getGoogleExportConfigOptional();
  if (!base) return null;
  return { ...base, sheetId: spreadsheetId };
}
