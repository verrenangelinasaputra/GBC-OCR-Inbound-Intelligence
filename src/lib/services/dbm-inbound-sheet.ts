import "server-only";

import { google } from "googleapis";
import { createGoogleSheetsAuthClient } from "@/lib/providers/google-workspace/client";
import { getDbmInboundSheetId, getDbmInboundTabName } from "@/lib/config/sku-mapping-sheets";
import type { SkuMappingLineRow } from "@/lib/sku-matching/sku-mapping-line";
import type { SkuRekapEntry } from "@/lib/sku-matching/sku-rekap-types";
import { googleConfigForSpreadsheet } from "@/lib/services/sku-rekap-catalog";

export const DBM_INBOUND_HEADERS = [
  "Tanggal Ekspor DBM",
  "Dikonfirmasi Oleh",
  "Gudang",
  "Supplier",
  "Tanggal SJ",
  "No. SJ",
  "Nama Barang (OCR)",
  "Banyaknya",
  "Isi",
  "Jumlah",
  "Keterangan",
  "Tipe Sample",
  "Row Key",
  "Doc Key",
  "Match Score",
  "SKU Lengkap",
  "Nama Internal Accurate",
  "Nama Produk Acuan",
  "Kategori Utama",
  "SKUS",
  "Barcode (Code 128)",
  "Sumber Lembar",
  "Link SJ (Drive)",
  "Ekspor Accurate",
  "Tanggal Ekspor Accurate",
] as const;

const DBM_COL_ACCURATE_TAG = 23;
const DBM_COL_ACCURATE_AT = 24;

function quoteTab(tab: string): string {
  return `'${tab.replace(/'/g, "''")}'`;
}

function wrapDbmSheetError(error: unknown): never {
  const message = error instanceof Error ? error.message : String(error);
  if (/permission|403|caller does not have/i.test(message)) {
    const id = getDbmInboundSheetId();
    throw new Error(
      `Tidak bisa menulis ke spreadsheet Data Barang Masuk (ID: ${id}). ` +
        "Pastikan: (1) Share → Editor untuk " +
        "gbc-inbound-export@gbc-inbound-intelligence.iam.gserviceaccount.com (atau client_email di Vercel), " +
        "(2) env DBM_INBOUND_SHEET_ID = ID di URL sheet yang Anda buka (bukan file lain), " +
        "(3) tab DBM_INBOUND_TAB cocok dengan nama tab di bawah."
    );
  }
  throw error instanceof Error ? error : new Error(message);
}

async function ensureDbmInboundTab(sheets: ReturnType<typeof google.sheets>, spreadsheetId: string, tab: string) {
  const meta = await sheets.spreadsheets.get({
    spreadsheetId,
    fields: "sheets.properties(title,sheetId)",
  });
  const titles = meta.data.sheets?.map((s) => s.properties?.title).filter(Boolean) as string[];
  if (!titles.includes(tab)) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [{ addSheet: { properties: { title: tab } } }],
      },
    });
  }

  const head = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${quoteTab(tab)}!A1:Y1`,
  });
  const headerRow = head.data.values?.[0] ?? [];
  const first = headerRow[0] ?? "";
  const needsFullHeader = String(first).trim() !== DBM_INBOUND_HEADERS[0];
  const needsAccurateCols =
    String(headerRow[DBM_COL_ACCURATE_TAG] ?? "").trim() !== DBM_INBOUND_HEADERS[DBM_COL_ACCURATE_TAG];
  if (needsFullHeader) {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${quoteTab(tab)}!A1`,
      valueInputOption: "RAW",
      requestBody: { values: [[...DBM_INBOUND_HEADERS]] },
    });
  } else if (needsAccurateCols) {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${quoteTab(tab)}!X1:Y1`,
      valueInputOption: "RAW",
      requestBody: {
        values: [[DBM_INBOUND_HEADERS[DBM_COL_ACCURATE_TAG], DBM_INBOUND_HEADERS[DBM_COL_ACCURATE_AT]]],
      },
    });
  }
}

export async function listDbmFinalizedRowKeys(): Promise<Set<string>> {
  const cfg = googleConfigForSpreadsheet(getDbmInboundSheetId());
  if (!cfg) return new Set();

  const auth = createGoogleSheetsAuthClient(cfg);
  const sheets = google.sheets({ version: "v4", auth });
  const tab = getDbmInboundTabName();
  const spreadsheetId = getDbmInboundSheetId();

  try {
    await ensureDbmInboundTab(sheets, spreadsheetId, tab);
  } catch {
    const fallback = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${quoteTab("Sheet1")}!A:M`,
    });
    const keys = new Set<string>();
    for (const row of fallback.data.values ?? []) {
      const rowKey = String(row[12] ?? "").trim();
      if (rowKey) keys.add(rowKey);
    }
    return keys;
  }

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${quoteTab(tab)}!A:M`,
  });
  const keys = new Set<string>();
  for (let i = 1; i < (res.data.values ?? []).length; i += 1) {
    const rowKey = String(res.data.values?.[i]?.[12] ?? "").trim();
    if (rowKey) keys.add(rowKey);
  }
  return keys;
}

export async function appendDbmInboundRow(params: {
  line: SkuMappingLineRow;
  catalog: SkuRekapEntry;
  matchScore: number;
  confirmedBy: string;
  linkSjDrive?: string;
}): Promise<void> {
  const cfg = googleConfigForSpreadsheet(getDbmInboundSheetId());
  if (!cfg) throw new Error("Google export tidak dikonfigurasi");

  const auth = createGoogleSheetsAuthClient(cfg);
  const sheets = google.sheets({ version: "v4", auth });
  const spreadsheetId = getDbmInboundSheetId();
  const tab = getDbmInboundTabName();

  try {
    await ensureDbmInboundTab(sheets, spreadsheetId, tab);
  } catch (e) {
    wrapDbmSheetError(e);
  }

  let nextRow = 2;
  try {
    const existing = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${quoteTab(tab)}!A:A`,
    });
    nextRow = (existing.data.values?.length ?? 0) + 1;
  } catch (e) {
    wrapDbmSheetError(e);
  }

  const now = new Date();
  const stamp = `${String(now.getDate()).padStart(2, "0")}/${String(now.getMonth() + 1).padStart(2, "0")}/${now.getFullYear()} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

  const row = [
    stamp,
    params.confirmedBy,
    params.line.gudang,
    params.line.supplier,
    params.line.tanggal,
    params.line.noSuratJalan,
    params.line.namaBarang,
    params.line.banyaknya,
    params.line.isi,
    params.line.jumlah,
    params.line.keterangan,
    params.line.sampleType,
    params.line.rowKey,
    params.line.docKey,
    String(matchScoreFormatted(params.matchScore)),
    params.catalog.skuLengkap,
    params.catalog.namaInternalAccurate,
    params.catalog.namaProdukAcuan,
    params.catalog.kategoriUtama,
    params.catalog.skus,
    params.catalog.barcode,
    params.catalog.sumberLembar,
    params.linkSjDrive || params.line.fileUrl || "",
    "",
    "",
  ];

  try {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${quoteTab(tab)}!A${nextRow}`,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [row] },
    });
  } catch (e) {
    wrapDbmSheetError(e);
  }
}

function matchScoreFormatted(score: number): string {
  return String(Math.round(score * 1000) / 1000);
}

function rowToRecord(
  row: string[],
  sheetRow: number
): import("@/lib/dbm/dbm-inbound-types").DbmInboundRecord | null {
  if (!row.length) return null;
  const rowKey = String(row[12] ?? "").trim();
  if (!rowKey) return null;
  const score = Number(String(row[14] ?? "0").replace(",", "."));
  return {
    exportedAt: String(row[0] ?? ""),
    confirmedBy: String(row[1] ?? ""),
    gudang: String(row[2] ?? ""),
    supplier: String(row[3] ?? ""),
    tanggalSj: String(row[4] ?? ""),
    noSj: String(row[5] ?? ""),
    namaBarangOcr: String(row[6] ?? ""),
    banyaknya: String(row[7] ?? ""),
    isi: String(row[8] ?? ""),
    jumlah: String(row[9] ?? ""),
    keterangan: String(row[10] ?? ""),
    sampleType: String(row[11] ?? ""),
    rowKey,
    docKey: String(row[13] ?? ""),
    matchScore: Number.isFinite(score) ? score : 0,
    skuLengkap: String(row[15] ?? ""),
    namaInternalAccurate: String(row[16] ?? ""),
    namaProdukAcuan: String(row[17] ?? ""),
    kategoriUtama: String(row[18] ?? ""),
    skus: String(row[19] ?? ""),
    barcode: String(row[20] ?? ""),
    sumberLembar: String(row[21] ?? ""),
    linkSjDrive: String(row[22] ?? ""),
    sheetRow,
    accurateExportTag: String(row[DBM_COL_ACCURATE_TAG] ?? ""),
    accurateExportedAt: String(row[DBM_COL_ACCURATE_AT] ?? ""),
  };
}

export async function listDbmInboundRecords(): Promise<import("@/lib/dbm/dbm-inbound-types").DbmInboundRecord[]> {
  const cfg = googleConfigForSpreadsheet(getDbmInboundSheetId());
  if (!cfg) return [];

  const auth = createGoogleSheetsAuthClient(cfg);
  const sheets = google.sheets({ version: "v4", auth });
  const spreadsheetId = getDbmInboundSheetId();
  const tab = getDbmInboundTabName();

  try {
    await ensureDbmInboundTab(sheets, spreadsheetId, tab);
  } catch {
    return [];
  }

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${quoteTab(tab)}!A:Y`,
  });

  const out: import("@/lib/dbm/dbm-inbound-types").DbmInboundRecord[] = [];
  for (let i = 1; i < (res.data.values ?? []).length; i += 1) {
    const rec = rowToRecord(res.data.values?.[i] ?? [], i + 1);
    if (rec) out.push(rec);
  }
  return out;
}

function formatAccurateExportStamp(d = new Date()): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

export async function markDbmInboundAccurateExported(sheetRows: number[]): Promise<string> {
  if (!sheetRows.length) return "";
  const cfg = googleConfigForSpreadsheet(getDbmInboundSheetId());
  if (!cfg) throw new Error("Google export tidak dikonfigurasi");

  const auth = createGoogleSheetsAuthClient(cfg);
  const sheets = google.sheets({ version: "v4", auth });
  const spreadsheetId = getDbmInboundSheetId();
  const tab = getDbmInboundTabName();
  const stamp = formatAccurateExportStamp();

  await ensureDbmInboundTab(sheets, spreadsheetId, tab);

  const data = sheetRows.map((sheetRow) => ({
    range: `${quoteTab(tab)}!X${sheetRow}:Y${sheetRow}`,
    values: [["Ya", stamp]],
  }));

  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId,
    requestBody: {
      valueInputOption: "USER_ENTERED",
      data,
    },
  });

  return stamp;
}
