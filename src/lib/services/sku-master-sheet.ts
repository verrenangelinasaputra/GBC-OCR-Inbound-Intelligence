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
import type {
  SkuMasterCodeOption,
  SkuMasterProductInput,
  SkuMasterProductResult,
} from "@/lib/sku-master/types";
import { googleConfigForSpreadsheet } from "@/lib/services/sku-rekap-catalog";
import { invalidateSkuRekapCatalogCache } from "@/lib/services/sku-rekap-catalog";

const REKAP_SKUL_TAB = "REKAP SKUL";
const REKAP_SKUS_TAB = "REKAP SKUS";

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
  const meta = await sheets.spreadsheets.get({
    spreadsheetId,
    fields: "sheets.properties(sheetId,title)",
  });
  const found = meta.data.sheets?.find((s) => s.properties?.title === tabTitle);
  const id = found?.properties?.sheetId;
  if (id == null) throw new Error(`Tab "${tabTitle}" tidak ditemukan`);
  return id;
}

export async function loadSkuMasterCodes(
  categoryTab: string,
  subIndex: number
): Promise<SkuMasterCodeOption[]> {
  if (!isGeneratorCategoryTab(categoryTab)) {
    throw new Error(`Kategori tidak valid: ${categoryTab}`);
  }
  if (subIndex < 1 || subIndex > 9) throw new Error("subIndex harus 1–9");

  const { sheets, spreadsheetId } = sheetsClient();
  const { code, label } = codePairColumns(subIndex);
  const codeCol = String.fromCharCode(65 + code);
  const range = `${quoteTab(categoryTab)}!${codeCol}${CODE_DICT_FIRST_DATA_ROW}:${String.fromCharCode(65 + label)}`;
  const res = await sheets.spreadsheets.values.get({ spreadsheetId, range });

  const rows = res.data.values ?? [];
  const out: SkuMasterCodeOption[] = [];
  for (let i = 0; i < rows.length; i += 1) {
    const row = rows[i] ?? [];
    const codeVal = String(row[0] ?? "").trim();
    if (!codeVal) break;
    out.push({
      code: codeVal,
      label: String(row[1] ?? "").trim() || codeVal,
      sheetRow: CODE_DICT_FIRST_DATA_ROW + i,
    });
  }
  return out;
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

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range,
    valueInputOption: "RAW",
    requestBody: { values: [[trimmedCode, trimmedLabel]] },
  });

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
  if (!isGeneratorCategoryTab(input.categoryTab)) {
    throw new Error(`Kategori tidak valid: ${input.categoryTab}`);
  }
  if (!input.namaProdukAcuan.trim() || !input.namaInternalAccurate.trim()) {
    throw new Error("Nama produk acuan dan nama internal wajib");
  }

  const { sheets, spreadsheetId } = sheetsClient();
  const sheetGid = await getTabSheetId(sheets, spreadsheetId, input.categoryTab);

  const lastRow = await findLastTableDataRow(sheets, spreadsheetId, input.categoryTab);
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

  const prevRow = await readTableRow(sheets, spreadsheetId, input.categoryTab, lastRow);
  const prevNo = Number(String(prevRow[0] ?? "0").replace(/\D/g, "")) || 0;
  const nextNo = String(prevNo + 1 || newRow - TABEL_FIRST_DATA_ROW + 1);

  const subs = [
    input.sub1,
    input.sub2,
    input.sub3,
    input.sub4,
    input.sub5,
    input.sub6,
    input.sub7,
    input.sub8,
    input.sub9,
  ].map((s) => String(s ?? "").trim());

  const valuesRow: string[] = [];
  valuesRow[0] = nextNo;
  valuesRow[1] = input.namaProdukAcuan.trim();
  valuesRow[2] = input.namaInternalAccurate.trim();
  for (let i = 0; i < 9; i += 1) valuesRow[3 + i] = subs[i] ?? "";

  const start = columnIndexToA1(COL.TABEL_NO, newRow);
  const end = columnIndexToA1(COL.TABEL_SUB9, newRow);
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${quoteTab(input.categoryTab)}!${start}:${end}`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [valuesRow] },
  });

  const filled = await readTableRow(sheets, spreadsheetId, input.categoryTab, newRow);
  const skuLengkap = String(filled[COL.TABEL_SKU_LENGKAP - COL.TABEL_NO] ?? "").trim();
  const barcode = String(filled[COL.TABEL_BARCODE - COL.TABEL_NO] ?? "").trim();
  const barcodeDisplay = String(filled[COL.TABEL_BARCODE_DISPLAY - COL.TABEL_NO] ?? "").trim();
  const skus = String(filled[COL.TABEL_SKUS - COL.TABEL_NO] ?? "").trim();

  if (!skuLengkap) {
    throw new Error(
      "SKU tidak ter-generate di sheet. Periksa formula baris template atau kombinasi Sub 1–9."
    );
  }

  const kategoriUtama = subs[0] || input.categoryTab;

  const rekap = await appendRekapSkulRow(sheets, spreadsheetId, {
    skuLengkap,
    namaInternalAccurate: input.namaInternalAccurate.trim(),
    namaProdukAcuan: input.namaProdukAcuan.trim(),
    kategoriUtama,
    skus,
    barcode,
    sumberLembar: input.categoryTab,
  });

  const rekapSkusUpdated = await upsertRekapSkusFamily(
    sheets,
    spreadsheetId,
    skus,
    input.namaInternalAccurate.trim(),
    input.categoryTab
  );

  invalidateSkuRekapCatalogCache();

  return {
    categoryTab: input.categoryTab,
    sheetRow: newRow,
    rowNo: rekap.rowNo,
    skuLengkap,
    skus,
    barcode,
    barcodeDisplay,
    namaProdukAcuan: input.namaProdukAcuan.trim(),
    namaInternalAccurate: input.namaInternalAccurate.trim(),
    kategoriUtama,
    rekapSkulRow: rekap.sheetRow,
    rekapSkusUpdated,
  };
}

export async function fetchRekapSkulRows(): Promise<string[][]> {
  const { sheets, spreadsheetId } = sheetsClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${quoteTab(REKAP_SKUL_TAB)}!A:H`,
  });
  return res.data.values ?? [];
}

export async function fetchRekapSkusRows(): Promise<string[][]> {
  const { sheets, spreadsheetId } = sheetsClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${quoteTab(REKAP_SKUS_TAB)}!A:E`,
  });
  return res.data.values ?? [];
}

export function getSkuMasterSpreadsheetIdForClient(): string {
  return getSkuMasterSheetId();
}