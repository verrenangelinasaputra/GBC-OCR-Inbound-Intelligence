import "server-only";

import { google } from "googleapis";
import { createGoogleSheetsAuthClient } from "@/lib/providers/google-workspace/client";
import { getGoogleExportConfigOptional } from "@/lib/providers/google-workspace/config";
import { getSkuMasterSheetId } from "@/lib/config/sku-mapping-sheets";
import {
  CODE_DICT_FIRST_DATA_ROW,
  COL,
  TABEL_FIRST_DATA_ROW,
  TABEL_TEMPLATE_DATA_ROW,
  codePairColumns,
  columnIndexToA1,
} from "@/lib/sku-master/sheet-layout";
import { isGeneratorCategoryTab } from "@/lib/sku-master/category-tabs";
import { resolveSub1ForCategoryTab } from "@/lib/sku-master/sub1-for-tab";
import type {
  SkuMasterCodeOption,
  SkuMasterProductInput,
  SkuMasterProductResult,
  SkuMasterProductUpdateInput,
  SkuMasterRekapSkulRow,
  SkuMasterRekapSkusRow,
  SkuMasterTableRow,
} from "@/lib/sku-master/types";
import { googleConfigForSpreadsheet } from "@/lib/services/sku-rekap-catalog";
import { invalidateSkuRekapCatalogCache } from "@/lib/services/sku-rekap-catalog";
import { mapSheetApiError } from "@/lib/google-sheets/sheet-values";

const REKAP_SKUL_TAB = "REKAP SKUL";
const REKAP_SKUS_TAB = "REKAP SKUS";

const CODE_CACHE_MS = 5 * 60 * 1000;
const TAB_GID_CACHE_MS = 30 * 60 * 1000;
const codeCache = new Map<string, { at: number; bySub: Record<number, SkuMasterCodeOption[]> }>();
const tabGidCache = new Map<string, { at: number; gids: Record<string, number> }>();

export function invalidateSkuMasterCodeCache(categoryTab?: string): void {
  if (!categoryTab) {
    codeCache.clear();
    return;
  }
  const prefix = `${getSkuMasterSheetId()}\t${categoryTab}`;
  for (const key of codeCache.keys()) {
    if (key.startsWith(prefix)) codeCache.delete(key);
  }
}

const LIST_CACHE_MS = 5 * 60 * 1000;
const tableListCache = new Map<string, { at: number; rows: SkuMasterTableRow[] }>();
let rekapSkulListCache: { at: number; rows: SkuMasterRekapSkulRow[] } | null = null;
let rekapSkusListCache: { at: number; rows: SkuMasterRekapSkusRow[] } | null = null;

export function invalidateSkuMasterListCaches(categoryTab?: string): void {
  if (!categoryTab) {
    tableListCache.clear();
  } else {
    const key = `${getSkuMasterSheetId()}\t${categoryTab}`;
    tableListCache.delete(key);
  }
  rekapSkulListCache = null;
  rekapSkusListCache = null;
}

function rel(row: string[], offsetFromNo: number): string {
  return String(row[offsetFromNo] ?? "").trim();
}

function parseTableSliceRow(categoryTab: string, sheetRow: number, row: string[]): SkuMasterTableRow | null {
  const namaProdukAcuan = rel(row, COL.TABEL_NAMA_PRODUK_ACUAN - COL.TABEL_NO);
  const skuLengkap = rel(row, COL.TABEL_SKU_LENGKAP - COL.TABEL_NO);
  if (!namaProdukAcuan && !skuLengkap) return null;
  return {
    categoryTab,
    sheetRow,
    no: rel(row, 0),
    namaProdukAcuan,
    namaInternalAccurate: rel(row, COL.TABEL_NAMA_INTERNAL - COL.TABEL_NO),
    sub1: rel(row, COL.TABEL_SUB1 - COL.TABEL_NO),
    sub2: rel(row, COL.TABEL_SUB2 - COL.TABEL_NO),
    sub3: rel(row, COL.TABEL_SUB3 - COL.TABEL_NO),
    sub4: rel(row, COL.TABEL_SUB4 - COL.TABEL_NO),
    sub5: rel(row, COL.TABEL_SUB5 - COL.TABEL_NO),
    sub6: rel(row, COL.TABEL_SUB6 - COL.TABEL_NO),
    sub7: rel(row, COL.TABEL_SUB7 - COL.TABEL_NO),
    sub8: rel(row, COL.TABEL_SUB8 - COL.TABEL_NO),
    sub9: rel(row, COL.TABEL_SUB9 - COL.TABEL_NO),
    skuLengkap,
    skus: rel(row, COL.TABEL_SKUS - COL.TABEL_NO),
    barcode: rel(row, COL.TABEL_BARCODE - COL.TABEL_NO),
  };
}

export async function listSkuMasterTableRows(
  categoryTab: string,
  force = false
): Promise<SkuMasterTableRow[]> {
  if (!isGeneratorCategoryTab(categoryTab)) {
    throw new Error(`Kategori tidak valid: ${categoryTab}`);
  }

  const cacheKey = `${getSkuMasterSheetId()}\t${categoryTab}`;
  const now = Date.now();
  const cached = tableListCache.get(cacheKey);
  if (!force && cached && now - cached.at < LIST_CACHE_MS) return cached.rows;

  const { sheets, spreadsheetId } = sheetsClient();
  const start = columnIndexToA1(COL.TABEL_NO, TABEL_FIRST_DATA_ROW);
  const end = columnIndexToA1(COL.TABEL_SKUS, 5000);
  try {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${quoteTab(categoryTab)}!${start}:${end}`,
    });
    const rows = res.data.values ?? [];
    const out: SkuMasterTableRow[] = [];
    for (let i = 0; i < rows.length; i += 1) {
      const parsed = parseTableSliceRow(categoryTab, TABEL_FIRST_DATA_ROW + i, rows[i] ?? []);
      if (parsed) out.push(parsed);
    }
    tableListCache.set(cacheKey, { at: now, rows: out });
    return out;
  } catch (e) {
    throw mapSheetApiError(e);
  }
}

export async function listSkuMasterRekapSkulRows(force = false): Promise<SkuMasterRekapSkulRow[]> {
  const now = Date.now();
  if (!force && rekapSkulListCache && now - rekapSkulListCache.at < LIST_CACHE_MS) {
    return rekapSkulListCache.rows;
  }
  const raw = await fetchRekapSkulRows();
  const out: SkuMasterRekapSkulRow[] = [];
  for (let i = 1; i < raw.length; i += 1) {
    const row = raw[i] ?? [];
    const skuLengkap = String(row[1] ?? "").trim();
    if (!skuLengkap) continue;
    out.push({
      rowNo: String(row[0] ?? "").trim(),
      skuLengkap,
      namaInternalAccurate: String(row[2] ?? "").trim(),
      namaProdukAcuan: String(row[3] ?? "").trim(),
      kategoriUtama: String(row[4] ?? "").trim(),
      skus: String(row[5] ?? "").trim(),
      barcode: String(row[6] ?? "").trim(),
      sumberLembar: String(row[7] ?? "").trim(),
    });
  }
  rekapSkulListCache = { at: now, rows: out };
  return out;
}

export async function listSkuMasterRekapSkusRows(force = false): Promise<SkuMasterRekapSkusRow[]> {
  const now = Date.now();
  if (!force && rekapSkusListCache && now - rekapSkusListCache.at < LIST_CACHE_MS) {
    return rekapSkusListCache.rows;
  }
  const raw = await fetchRekapSkusRows();
  const out: SkuMasterRekapSkusRow[] = [];
  for (let i = 1; i < raw.length; i += 1) {
    const row = raw[i] ?? [];
    const skus = String(row[1] ?? "").trim();
    if (!skus) continue;
    out.push({
      rowNo: String(row[0] ?? "").trim(),
      skus,
      namaInternal: String(row[2] ?? "").trim(),
      variantCount: Number(String(row[3] ?? "0").replace(/\D/g, "")) || 0,
      sourceTab: String(row[4] ?? "").trim(),
    });
  }
  rekapSkusListCache = { at: now, rows: out };
  return out;
}

function parseSubColumnFromRows(rows: string[][], subIndex: number): SkuMasterCodeOption[] {
  const { code: codeCol, label: labelCol } = codePairColumns(subIndex);
  const out: SkuMasterCodeOption[] = [];
  for (let i = 0; i < rows.length; i += 1) {
    const row = rows[i] ?? [];
    const codeVal = String(row[codeCol] ?? "").trim();
    if (!codeVal) break;
    out.push({
      code: codeVal,
      label: String(row[labelCol] ?? "").trim() || codeVal,
      sheetRow: CODE_DICT_FIRST_DATA_ROW + i,
    });
  }
  return out;
}

/** Satu read (A:R) untuk semua Sub 1–9 — menghemat kuota vs 9× values.get. */
export async function loadSkuMasterCodesForTab(
  categoryTab: string,
  force = false
): Promise<Record<number, SkuMasterCodeOption[]>> {
  if (!isGeneratorCategoryTab(categoryTab)) {
    throw new Error(`Kategori tidak valid: ${categoryTab}`);
  }

  const cacheKey = `${getSkuMasterSheetId()}\t${categoryTab}`;
  const now = Date.now();
  const cached = codeCache.get(cacheKey);
  if (!force && cached && now - cached.at < CODE_CACHE_MS) {
    return cached.bySub;
  }

  const { sheets, spreadsheetId } = sheetsClient();
  const range = `${quoteTab(categoryTab)}!A${CODE_DICT_FIRST_DATA_ROW}:R`;
  try {
    const res = await sheets.spreadsheets.values.get({ spreadsheetId, range });
    const rows = res.data.values ?? [];
    const bySub: Record<number, SkuMasterCodeOption[]> = {};
    for (let subIndex = 1; subIndex <= 9; subIndex += 1) {
      bySub[subIndex] = parseSubColumnFromRows(rows, subIndex);
    }
    codeCache.set(cacheKey, { at: now, bySub });
    return bySub;
  } catch (e) {
    throw mapSheetApiError(e);
  }
}

function quoteTab(tab: string): string {
  return `'${tab.replace(/'/g, "''")}'`;
}

function sheetsClient() {
  const base = getGoogleExportConfigOptional();
  if (!base) throw new Error("Google export tidak dikonfigurasi");
  const spreadsheetId = getSkuMasterSheetId();
  const cfg = googleConfigForSpreadsheet(spreadsheetId) ?? base;
  const auth = createGoogleSheetsAuthClient(cfg);
  return { sheets: google.sheets({ version: "v4", auth }), spreadsheetId };
}

async function getTabSheetId(
  sheets: ReturnType<typeof google.sheets>,
  spreadsheetId: string,
  tabTitle: string
): Promise<number> {
  const cacheKey = spreadsheetId;
  const now = Date.now();
  const cached = tabGidCache.get(cacheKey);
  if (cached && now - cached.at < TAB_GID_CACHE_MS) {
    const id = cached.gids[tabTitle];
    if (id != null) return id;
  }

  try {
    const meta = await sheets.spreadsheets.get({
      spreadsheetId,
      fields: "sheets.properties(sheetId,title)",
    });
    const gids: Record<string, number> = { ...(cached?.gids ?? {}) };
    for (const s of meta.data.sheets ?? []) {
      const title = s.properties?.title;
      const sid = s.properties?.sheetId;
      if (title != null && sid != null) gids[title] = sid;
    }
    tabGidCache.set(cacheKey, { at: now, gids });
    const id = gids[tabTitle];
    if (id == null) throw new Error(`Tab "${tabTitle}" tidak ditemukan`);
    return id;
  } catch (e) {
    throw mapSheetApiError(e);
  }
}

export async function loadSkuMasterCodes(
  categoryTab: string,
  subIndex: number
): Promise<SkuMasterCodeOption[]> {
  if (subIndex < 1 || subIndex > 9) throw new Error("subIndex harus 1–9");
  const bySub = await loadSkuMasterCodesForTab(categoryTab);
  return bySub[subIndex] ?? [];
}

export async function appendSkuMasterCode(
  categoryTab: string,
  subIndex: number,
  code: string,
  label: string
): Promise<SkuMasterCodeOption> {
  if (!isGeneratorCategoryTab(categoryTab)) throw new Error(`Kategori tidak valid: ${categoryTab}`);
  const trimmedCode = code.trim();
  const trimmedLabel = label.trim() || trimmedCode;
  if (!trimmedCode) throw new Error("Kode wajib");

  const existing = await loadSkuMasterCodes(categoryTab, subIndex);
  if (existing.some((e) => e.code.toLowerCase() === trimmedCode.toLowerCase())) {
    throw new Error("Kode sudah ada di kamus");
  }

  const { sheets, spreadsheetId } = sheetsClient();
  const nextRow =
    existing.length > 0
      ? existing[existing.length - 1]!.sheetRow + 1
      : CODE_DICT_FIRST_DATA_ROW;
  const { code: codeCol, label: labelCol } = codePairColumns(subIndex);
  const range = `${quoteTab(categoryTab)}!${columnIndexToA1(codeCol, nextRow)}:${columnIndexToA1(labelCol, nextRow)}`;

  try {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range,
      valueInputOption: "RAW",
      requestBody: { values: [[trimmedCode, trimmedLabel]] },
    });
  } catch (e) {
    throw mapSheetApiError(e);
  }

  invalidateSkuMasterCodeCache(categoryTab);
  return { code: trimmedCode, label: trimmedLabel, sheetRow: nextRow };
}

async function findLastTableDataRow(
  sheets: ReturnType<typeof google.sheets>,
  spreadsheetId: string,
  categoryTab: string
): Promise<number> {
  const noCol = columnIndexToA1(COL.TABEL_NO, TABEL_FIRST_DATA_ROW);
  const range = `${quoteTab(categoryTab)}!${noCol}:${columnIndexToA1(COL.TABEL_SKUS, 5000)}`;
  const res = await sheets.spreadsheets.values.get({ spreadsheetId, range });
  const rows = res.data.values ?? [];
  let last = TABEL_FIRST_DATA_ROW - 1;
  for (let i = 0; i < rows.length; i += 1) {
    const no = String(rows[i]?.[0] ?? "").trim();
  const nama = String(rows[i]?.[COL.TABEL_NAMA_PRODUK_ACUAN - COL.TABEL_NO] ?? "").trim();
    if (no || nama) last = TABEL_FIRST_DATA_ROW + i;
  }
  return Math.max(last, TABEL_FIRST_DATA_ROW);
}

async function readTableRow(
  sheets: ReturnType<typeof google.sheets>,
  spreadsheetId: string,
  categoryTab: string,
  rowOneBased: number
): Promise<string[]> {
  const start = columnIndexToA1(COL.TABEL_NO, rowOneBased);
  const end = columnIndexToA1(COL.TABEL_SKUS, rowOneBased);
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${quoteTab(categoryTab)}!${start}:${end}`,
  });
  return res.data.values?.[0] ?? [];
}

async function appendRekapSkulRow(
  sheets: ReturnType<typeof google.sheets>,
  spreadsheetId: string,
  line: {
    skuLengkap: string;
    namaInternalAccurate: string;
    namaProdukAcuan: string;
    kategoriUtama: string;
    skus: string;
    barcode: string;
    sumberLembar: string;
  }
): Promise<{ rowNo: string; sheetRow: number }> {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${quoteTab(REKAP_SKUL_TAB)}!A:A`,
  });
  const rows = res.data.values ?? [];
  const nextNo = rows.length;
  const rowNo = String(nextNo);

  const appendRes = await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `${quoteTab(REKAP_SKUL_TAB)}!A:H`,
    valueInputOption: "RAW",
    insertDataOption: "INSERT_ROWS",
    requestBody: {
      values: [
        [
          rowNo,
          line.skuLengkap,
          line.namaInternalAccurate,
          line.namaProdukAcuan,
          line.kategoriUtama,
          line.skus,
          line.barcode,
          line.sumberLembar,
        ],
      ],
    },
  });

  const updatedRange = appendRes.data.updates?.updatedRange ?? "";
  const rowMatch = /!A(\d+)/i.exec(updatedRange);
  const sheetRow = rowMatch ? Number(rowMatch[1]) : rows.length + 1;
  return { rowNo, sheetRow };
}

async function upsertRekapSkusFamily(
  sheets: ReturnType<typeof google.sheets>,
  spreadsheetId: string,
  skus: string,
  namaInternalHint: string,
  sourceTab: string
): Promise<boolean> {
  if (!skus.trim()) return false;

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${quoteTab(REKAP_SKUS_TAB)}!A:E`,
  });
  const rows = res.data.values ?? [];
  let targetRowOneBased = 0;
  let variantCount = 0;

  for (let i = 1; i < rows.length; i += 1) {
    const row = rows[i] ?? [];
    const existingSkus = String(row[1] ?? "").trim();
    if (existingSkus.toLowerCase() === skus.toLowerCase()) {
      targetRowOneBased = i + 1;
      variantCount = Number(String(row[3] ?? "0").replace(/\D/g, "")) || 0;
      break;
    }
  }

  if (targetRowOneBased > 0) {
    const next = variantCount + 1;
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${quoteTab(REKAP_SKUS_TAB)}!D${targetRowOneBased}`,
      valueInputOption: "RAW",
      requestBody: { values: [[String(next)]] },
    });
    return true;
  }

  const nextNo = rows.length;
  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `${quoteTab(REKAP_SKUS_TAB)}!A:E`,
    valueInputOption: "RAW",
    insertDataOption: "INSERT_ROWS",
    requestBody: {
      values: [[String(nextNo), skus, namaInternalHint, "1", sourceTab]],
    },
  });
  return true;
}

export async function createSkuMasterProduct(
  input: SkuMasterProductInput
): Promise<SkuMasterProductResult> {
  try {
    return await createSkuMasterProductInner(input);
  } catch (e) {
    throw mapSheetApiError(e);
  }
}

async function createSkuMasterProductInner(
  input: SkuMasterProductInput
): Promise<SkuMasterProductResult> {
  if (!isGeneratorCategoryTab(input.categoryTab)) {
    throw new Error(`Kategori tidak valid: ${input.categoryTab}`);
  }
  if (!input.namaProdukAcuan.trim() || !input.namaInternalAccurate.trim()) {
    throw new Error("Nama produk acuan dan nama internal wajib");
  }

  const codesBySub = await loadSkuMasterCodesForTab(input.categoryTab);
  const sub1Resolved = input.sub1.trim() || resolveSub1ForCategoryTab(input.categoryTab, codesBySub[1] ?? []);
  const normalizedInput: SkuMasterProductInput = { ...input, sub1: sub1Resolved };

  const { sheets, spreadsheetId } = sheetsClient();
  const sheetGid = await getTabSheetId(sheets, spreadsheetId, normalizedInput.categoryTab);

  const lastRow = await findLastTableDataRow(sheets, spreadsheetId, normalizedInput.categoryTab);
  const newRow = lastRow + 1;
  const templateRowIndex = TABEL_TEMPLATE_DATA_ROW - 1;

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [
        {
          copyPaste: {
            source: {
              sheetId: sheetGid,
              startRowIndex: templateRowIndex,
              endRowIndex: templateRowIndex + 1,
              startColumnIndex: 0,
              endColumnIndex: 36,
            },
            destination: {
              sheetId: sheetGid,
              startRowIndex: newRow - 1,
              endRowIndex: newRow,
              startColumnIndex: 0,
              endColumnIndex: 36,
            },
            pasteType: "PASTE_NORMAL",
          },
        },
      ],
    },
  });

  const prevRow = await readTableRow(sheets, spreadsheetId, normalizedInput.categoryTab, lastRow);
  const prevNo = Number(String(prevRow[0] ?? "0").replace(/\D/g, "")) || 0;
  const nextNo = String(prevNo + 1 || newRow - TABEL_FIRST_DATA_ROW + 1);

  const subs = [
    normalizedInput.sub1,
    normalizedInput.sub2,
    normalizedInput.sub3,
    normalizedInput.sub4,
    normalizedInput.sub5,
    normalizedInput.sub6,
    normalizedInput.sub7,
    normalizedInput.sub8,
    normalizedInput.sub9,
  ].map((s) => String(s ?? "").trim());

  const valuesRow: string[] = [];
  valuesRow[0] = nextNo;
  valuesRow[1] = normalizedInput.namaProdukAcuan.trim();
  valuesRow[2] = normalizedInput.namaInternalAccurate.trim();
  for (let i = 0; i < 9; i += 1) valuesRow[3 + i] = subs[i] ?? "";

  const start = columnIndexToA1(COL.TABEL_NO, newRow);
  const end = columnIndexToA1(COL.TABEL_SUB9, newRow);
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${quoteTab(normalizedInput.categoryTab)}!${start}:${end}`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [valuesRow] },
  });

  const filled = await readTableRow(sheets, spreadsheetId, normalizedInput.categoryTab, newRow);
  const skuLengkap = String(filled[COL.TABEL_SKU_LENGKAP - COL.TABEL_NO] ?? "").trim();
  const barcode = String(filled[COL.TABEL_BARCODE - COL.TABEL_NO] ?? "").trim();
  const barcodeDisplay = String(filled[COL.TABEL_BARCODE_DISPLAY - COL.TABEL_NO] ?? "").trim();
  const skus = String(filled[COL.TABEL_SKUS - COL.TABEL_NO] ?? "").trim();

  if (!skuLengkap) {
    throw new Error(
      "SKU tidak ter-generate di sheet. Periksa formula baris template atau kombinasi Sub 1–9."
    );
  }

  const kategoriUtama = subs[0] || normalizedInput.categoryTab;

  const rekap = await appendRekapSkulRow(sheets, spreadsheetId, {
    skuLengkap,
    namaInternalAccurate: normalizedInput.namaInternalAccurate.trim(),
    namaProdukAcuan: normalizedInput.namaProdukAcuan.trim(),
    kategoriUtama,
    skus,
    barcode,
    sumberLembar: normalizedInput.categoryTab,
  });

  const rekapSkusUpdated = await upsertRekapSkusFamily(
    sheets,
    spreadsheetId,
    skus,
    normalizedInput.namaInternalAccurate.trim(),
    normalizedInput.categoryTab
  );

  invalidateSkuRekapCatalogCache();
  invalidateSkuMasterListCaches(normalizedInput.categoryTab);

  return {
    categoryTab: normalizedInput.categoryTab,
    sheetRow: newRow,
    rowNo: rekap.rowNo,
    skuLengkap,
    skus,
    barcode,
    barcodeDisplay,
    namaProdukAcuan: normalizedInput.namaProdukAcuan.trim(),
    namaInternalAccurate: normalizedInput.namaInternalAccurate.trim(),
    kategoriUtama,
    rekapSkulRow: rekap.sheetRow,
    rekapSkusUpdated,
  };
}

async function syncRekapSkulAfterTableEdit(
  sheets: ReturnType<typeof google.sheets>,
  spreadsheetId: string,
  lookup: {
    oldSkuLengkap: string;
    namaProdukAcuan: string;
    sourceTab: string;
  },
  line: {
    skuLengkap: string;
    namaInternalAccurate: string;
    namaProdukAcuan: string;
    kategoriUtama: string;
    skus: string;
    barcode: string;
  }
): Promise<void> {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${quoteTab(REKAP_SKUL_TAB)}!A:H`,
  });
  const rows = res.data.values ?? [];
  let targetRow = 0;
  const oldSku = lookup.oldSkuLengkap.trim();

  for (let i = 1; i < rows.length; i += 1) {
    const row = rows[i] ?? [];
    const sku = String(row[1] ?? "").trim();
    const nama = String(row[3] ?? "").trim();
    const sumber = String(row[7] ?? "").trim();
    if (oldSku && sku === oldSku) {
      targetRow = i + 1;
      break;
    }
    if (!targetRow && nama === lookup.namaProdukAcuan.trim() && sumber === lookup.sourceTab) {
      targetRow = i + 1;
    }
  }

  const values = [
    line.skuLengkap,
    line.namaInternalAccurate,
    line.namaProdukAcuan,
    line.kategoriUtama,
    line.skus,
    line.barcode,
    lookup.sourceTab,
  ];

  if (targetRow > 0) {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${quoteTab(REKAP_SKUL_TAB)}!B${targetRow}:H${targetRow}`,
      valueInputOption: "RAW",
      requestBody: { values: [values] },
    });
    return;
  }

  await appendRekapSkulRow(sheets, spreadsheetId, {
    skuLengkap: line.skuLengkap,
    namaInternalAccurate: line.namaInternalAccurate,
    namaProdukAcuan: line.namaProdukAcuan,
    kategoriUtama: line.kategoriUtama,
    skus: line.skus,
    barcode: line.barcode,
    sumberLembar: lookup.sourceTab,
  });
}

export async function updateSkuMasterProduct(
  input: SkuMasterProductUpdateInput
): Promise<SkuMasterProductResult> {
  try {
    return await updateSkuMasterProductInner(input);
  } catch (e) {
    throw mapSheetApiError(e);
  }
}

async function updateSkuMasterProductInner(
  input: SkuMasterProductUpdateInput
): Promise<SkuMasterProductResult> {
  if (!isGeneratorCategoryTab(input.categoryTab)) {
    throw new Error(`Kategori tidak valid: ${input.categoryTab}`);
  }
  if (input.sheetRow < TABEL_FIRST_DATA_ROW) {
    throw new Error("Baris sheet tidak valid");
  }
  if (!input.namaProdukAcuan.trim() || !input.namaInternalAccurate.trim()) {
    throw new Error("Nama produk acuan dan nama internal wajib");
  }

  const codesBySub = await loadSkuMasterCodesForTab(input.categoryTab);
  const sub1Resolved = input.sub1.trim() || resolveSub1ForCategoryTab(input.categoryTab, codesBySub[1] ?? []);
  const normalizedInput: SkuMasterProductUpdateInput = { ...input, sub1: sub1Resolved };

  const { sheets, spreadsheetId } = sheetsClient();
  const existing = await readTableRow(
    sheets,
    spreadsheetId,
    normalizedInput.categoryTab,
    normalizedInput.sheetRow
  );
  const oldSku =
    normalizedInput.oldSkuLengkap?.trim() ||
    String(existing[COL.TABEL_SKU_LENGKAP - COL.TABEL_NO] ?? "").trim();

  const subs = [
    normalizedInput.sub1,
    normalizedInput.sub2,
    normalizedInput.sub3,
    normalizedInput.sub4,
    normalizedInput.sub5,
    normalizedInput.sub6,
    normalizedInput.sub7,
    normalizedInput.sub8,
    normalizedInput.sub9,
  ].map((s) => String(s ?? "").trim());

  const valuesRow: string[] = [];
  valuesRow[0] = String(existing[0] ?? normalizedInput.sheetRow - TABEL_FIRST_DATA_ROW + 1);
  valuesRow[1] = normalizedInput.namaProdukAcuan.trim();
  valuesRow[2] = normalizedInput.namaInternalAccurate.trim();
  for (let i = 0; i < 9; i += 1) valuesRow[3 + i] = subs[i] ?? "";

  const start = columnIndexToA1(COL.TABEL_NO, normalizedInput.sheetRow);
  const end = columnIndexToA1(COL.TABEL_SUB9, normalizedInput.sheetRow);
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${quoteTab(normalizedInput.categoryTab)}!${start}:${end}`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [valuesRow] },
  });

  const filled = await readTableRow(
    sheets,
    spreadsheetId,
    normalizedInput.categoryTab,
    normalizedInput.sheetRow
  );
  const skuLengkap = String(filled[COL.TABEL_SKU_LENGKAP - COL.TABEL_NO] ?? "").trim();
  const barcode = String(filled[COL.TABEL_BARCODE - COL.TABEL_NO] ?? "").trim();
  const barcodeDisplay = String(filled[COL.TABEL_BARCODE_DISPLAY - COL.TABEL_NO] ?? "").trim();
  const skus = String(filled[COL.TABEL_SKUS - COL.TABEL_NO] ?? "").trim();

  if (!skuLengkap) {
    throw new Error("SKU tidak ter-generate setelah edit. Periksa Sub 1–9.");
  }

  const kategoriUtama = subs[0] || normalizedInput.categoryTab;

  await syncRekapSkulAfterTableEdit(
    sheets,
    spreadsheetId,
    {
      oldSkuLengkap: oldSku,
      namaProdukAcuan: normalizedInput.namaProdukAcuan.trim(),
      sourceTab: normalizedInput.categoryTab,
    },
    {
      skuLengkap,
      namaInternalAccurate: normalizedInput.namaInternalAccurate.trim(),
      namaProdukAcuan: normalizedInput.namaProdukAcuan.trim(),
      kategoriUtama,
      skus,
      barcode,
    }
  );

  invalidateSkuRekapCatalogCache();
  invalidateSkuMasterListCaches(normalizedInput.categoryTab);

  return {
    categoryTab: normalizedInput.categoryTab,
    sheetRow: normalizedInput.sheetRow,
    rowNo: valuesRow[0] ?? "",
    skuLengkap,
    skus,
    barcode,
    barcodeDisplay,
    namaProdukAcuan: normalizedInput.namaProdukAcuan.trim(),
    namaInternalAccurate: normalizedInput.namaInternalAccurate.trim(),
    kategoriUtama,
    rekapSkusUpdated: false,
  };
}

export async function fetchRekapSkulRows(): Promise<string[][]> {
  const { sheets, spreadsheetId } = sheetsClient();
  try {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${quoteTab(REKAP_SKUL_TAB)}!A:H`,
    });
    return res.data.values ?? [];
  } catch (e) {
    throw mapSheetApiError(e);
  }
}

export async function fetchRekapSkusRows(): Promise<string[][]> {
  const { sheets, spreadsheetId } = sheetsClient();
  try {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${quoteTab(REKAP_SKUS_TAB)}!A:E`,
    });
    return res.data.values ?? [];
  } catch (e) {
    throw mapSheetApiError(e);
  }
}

export function getSkuMasterSpreadsheetIdForClient(): string {
  return getSkuMasterSheetId();
}