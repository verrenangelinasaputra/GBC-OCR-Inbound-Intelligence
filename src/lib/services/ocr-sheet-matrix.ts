import "server-only";

import { google } from "googleapis";
import type { GoogleExportConfig } from "@/lib/providers/google-workspace/config";
import {
  OCR_CUSTOMER_TAB_NAME,
  getOcrExportSheetTab,
} from "@/lib/config/ocr-export-target";
import { SUPPLIER_CUSTOMER_DESTINATION } from "@/lib/config/supplier-gudang";
import {
  createGoogleAuthClient,
  resolveSheetTabName,
} from "@/lib/providers/google-workspace/client";
import { ocrSheetFullColumnsRange } from "@/lib/providers/google-workspace/ocr-sheet-columns";
import {
  decodeOcrSheetDocKey,
  firstRowIsOcrHeader,
  sheetRowMatchesDocKey,
} from "@/lib/services/ocr-sheet-keys";

export type OcrSheetMatrix = {
  config: GoogleExportConfig;
  sheets: ReturnType<typeof google.sheets>;
  sheetTab: string;
  sheetGridId: number;
  rows: string[][];
};

/** Tab mana saja yang dibaca untuk filter gudang profil pengguna. */
export function ocrReadTabTitlesForGudangFilter(gudangFilter?: string[]): string[] {
  const main = getOcrExportSheetTab();
  if (!gudangFilter?.length) return [main, OCR_CUSTOMER_TAB_NAME];
  const set = new Set(gudangFilter);
  const onlyCustomer =
    set.size === 1 && set.has(SUPPLIER_CUSTOMER_DESTINATION);
  if (onlyCustomer) return [OCR_CUSTOMER_TAB_NAME];
  if (!set.has(SUPPLIER_CUSTOMER_DESTINATION)) return [main];
  return [main, OCR_CUSTOMER_TAB_NAME];
}

export async function listSpreadsheetTabTitles(config: GoogleExportConfig): Promise<string[]> {
  const auth = createGoogleAuthClient(config);
  const sheets = google.sheets({ version: "v4", auth });
  const meta = await sheets.spreadsheets.get({
    spreadsheetId: config.sheetId,
    fields: "sheets.properties.title",
  });
  return (meta.data.sheets?.map((s) => s.properties?.title).filter(Boolean) as string[]) ?? [];
}

/** Tab OCR yang benar-benar ada di workbook (urutan: utama dulu, lalu Customer). */
export async function listExistingOcrDataTabs(config: GoogleExportConfig): Promise<string[]> {
  const titles = await listSpreadsheetTabTitles(config);
  const main = await resolveSheetTabName(config);
  const tabs: string[] = [];
  if (titles.includes(main)) tabs.push(main);
  if (titles.includes(OCR_CUSTOMER_TAB_NAME)) tabs.push(OCR_CUSTOMER_TAB_NAME);
  return tabs.length ? tabs : [main];
}

export async function readOcrSheetTabs(
  config: GoogleExportConfig,
  tabTitles: string[]
): Promise<{ sheets: ReturnType<typeof google.sheets>; rowsByTab: Map<string, string[][]> }> {
  const auth = createGoogleAuthClient(config);
  const sheets = google.sheets({ version: "v4", auth });
  const existing = await listSpreadsheetTabTitles(config);
  const rowsByTab = new Map<string, string[][]>();

  for (const title of tabTitles) {
    const tabConfig = { ...config, sheetTab: title };
    const sheetTab = await resolveSheetTabName(tabConfig);
    // resolve dulu (mis. env "Data Compilation" → tab aktual "Sheet1"), baru cek ada/tidak
    if (!existing.includes(sheetTab)) continue;
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: config.sheetId,
      range: ocrSheetFullColumnsRange(sheetTab),
    });
    rowsByTab.set(sheetTab, res.data.values ?? []);
  }

  return { sheets, rowsByTab };
}

export async function readOcrSheetMatrixForDocKey(docKey: string): Promise<OcrSheetMatrix> {
  const { getGoogleExportConfigOptional } = await import("@/lib/providers/google-workspace");
  const config = getGoogleExportConfigOptional();
  if (!config) throw new Error("Google export tidak dikonfigurasi");

  const rawKey = decodeOcrSheetDocKey(docKey);
  const tabs = await listExistingOcrDataTabs(config);
  const auth = createGoogleAuthClient(config);
  const sheets = google.sheets({ version: "v4", auth });

  const meta = await sheets.spreadsheets.get({
    spreadsheetId: config.sheetId,
    fields: "sheets.properties(sheetId,title)",
  });

  for (const title of tabs) {
    const tabConfig = { ...config, sheetTab: title };
    const sheetTab = await resolveSheetTabName(tabConfig);
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: config.sheetId,
      range: ocrSheetFullColumnsRange(sheetTab),
    });
    const rows = res.data.values ?? [];
    let found = false;
    for (let i = 0; i < rows.length; i += 1) {
      const row = rows[i];
      if (i === 0 && firstRowIsOcrHeader(row)) continue;
      if (sheetRowMatchesDocKey(row ?? [], rawKey)) {
        found = true;
        break;
      }
    }
    if (!found) continue;

    const sheetGridId = meta.data.sheets?.find((s) => s.properties?.title === sheetTab)?.properties
      ?.sheetId;
    if (sheetGridId == null) throw new Error("Tab spreadsheet tidak ditemukan");
    return { config: tabConfig, sheets, sheetTab, sheetGridId, rows };
  }

  throw new Error("Dokumen tidak ditemukan di spreadsheet");
}