import "server-only";

import { google } from "googleapis";
import { createGoogleAuthClient } from "@/lib/providers/google-workspace/client";
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
] as const;

function quoteTab(tab: string): string {
  return `'${tab.replace(/'/g, "''")}'`;
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
    range: `${quoteTab(tab)}!A1:V1`,
  });
  const first = head.data.values?.[0]?.[0] ?? "";
  if (String(first).trim() !== DBM_INBOUND_HEADERS[0]) {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${quoteTab(tab)}!A1`,
      valueInputOption: "RAW",
      requestBody: { values: [ [...DBM_INBOUND_HEADERS] ] },
    });
  }
}

export async function listDbmFinalizedRowKeys(): Promise<Set<string>> {
  const cfg = googleConfigForSpreadsheet(getDbmInboundSheetId());
  if (!cfg) return new Set();

  const auth = createGoogleAuthClient(cfg);
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

  const auth = createGoogleAuthClient(cfg);
  const sheets = google.sheets({ version: "v4", auth });
  const spreadsheetId = getDbmInboundSheetId();
  const tab = getDbmInboundTabName();

  await ensureDbmInboundTab(sheets, spreadsheetId, tab);

  const existing = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${quoteTab(tab)}!A:A`,
  });
  const nextRow = (existing.data.values?.length ?? 0) + 1;

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
  ];

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${quoteTab(tab)}!A${nextRow}`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [row] },
  });
}

function matchScoreFormatted(score: number): string {
  return String(Math.round(score * 1000) / 1000);
}

function rowToRecord(row: string[]): import("@/lib/dbm/dbm-inbound-types").DbmInboundRecord | null {
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
  };
}

export async function listDbmInboundRecords(): Promise<import("@/lib/dbm/dbm-inbound-types").DbmInboundRecord[]> {
  const cfg = googleConfigForSpreadsheet(getDbmInboundSheetId());
  if (!cfg) return [];

  const auth = createGoogleAuthClient(cfg);
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
    range: `${quoteTab(tab)}!A:W`,
  });

  const out: import("@/lib/dbm/dbm-inbound-types").DbmInboundRecord[] = [];
  for (let i = 1; i < (res.data.values ?? []).length; i += 1) {
    const rec = rowToRecord(res.data.values?.[i] ?? []);
    if (rec) out.push(rec);
  }
  return out;
}
