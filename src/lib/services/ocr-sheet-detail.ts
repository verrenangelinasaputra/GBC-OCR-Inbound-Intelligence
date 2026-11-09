import { google } from "googleapis";
import { createGoogleAuthClient, resolveSheetTabName } from "@/lib/providers/google-workspace/client";
import { getGoogleExportConfigOptional } from "@/lib/providers/google-workspace";
import { recomputeOcrSheetLineStatus } from "@/lib/providers/google-workspace/google-sj-export-rows";
import {
  mapOcrSheetRow,
  ocrSheetFullColumnsRange,
  ocrSheetRowRange,
  ocrSheetRowToValues,
  type OcrSheetRowFields,
} from "@/lib/providers/google-workspace/ocr-sheet-columns";
import {
  decodeOcrSheetDocKey,
  firstRowIsOcrHeader,
  sheetRowMatchesDocKey,
} from "@/lib/services/ocr-sheet-keys";

export type OcrSheetLine = OcrSheetRowFields & { sheetRow: number };

export type OcrSheetDocumentDetail = {
  docKey: string;
  gudang: string;
  exportTimestamp: string;
  tanggal: string;
  noSuratJalan: string;
  noKendaraan: string;
  noPo: string;
  namaPenerima: string;
  alamat: string;
  fileName: string;
  fileUrl: string;
  kendaraanDriver: string;
  catatan: string;
  lineStatus: string;
  lines: OcrSheetLine[];
};

function lineFromRow(sheetRow: number, row: string[]): OcrSheetLine {
  return { sheetRow, ...mapOcrSheetRow(row) };
}

function rowFromLine(line: OcrSheetLine): string[] {
  const status =
    line.status.trim().toUpperCase() === "CEK" || line.status.trim().toUpperCase() === "OK"
      ? line.status.trim().toUpperCase()
      : recomputeOcrSheetLineStatus({
          banyaknya: line.banyaknya,
          isi: line.isi,
          jumlah: line.jumlah,
          namaBarang: line.namaBarang,
        });
  return ocrSheetRowToValues({ ...line, status });
}

async function readSheetMatrix() {
  const config = getGoogleExportConfigOptional();
  if (!config) throw new Error("Google export tidak dikonfigurasi");

  const auth = createGoogleAuthClient(config);
  const sheets = google.sheets({ version: "v4", auth });
  const sheetTab = await resolveSheetTabName(config);
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: config.sheetId,
    range: ocrSheetFullColumnsRange(sheetTab),
  });
  return { config, sheets, sheetTab, rows: res.data.values ?? [] };
}

export async function getOcrSheetDocumentDetail(docKey: string): Promise<OcrSheetDocumentDetail> {
  const rawKey = decodeOcrSheetDocKey(docKey);
  const { rows } = await readSheetMatrix();
  const lines: OcrSheetLine[] = [];

  for (let i = 0; i < rows.length; i += 1) {
    const row = rows[i];
    if (i === 0 && firstRowIsOcrHeader(row)) continue;
    if (!sheetRowMatchesDocKey(row ?? [], rawKey)) continue;
    lines.push(lineFromRow(i + 1, row ?? []));
  }

  if (lines.length === 0) {
    throw new Error("Dokumen tidak ditemukan di spreadsheet");
  }

  const head = lines[0];
  const statuses = new Set(lines.map((l) => l.status));
  return {
    docKey,
    gudang: head.gudang,
    exportTimestamp: head.exportTimestamp,
    tanggal: head.tanggal,
    noSuratJalan: head.noSuratJalan,
    noKendaraan: head.noKendaraan,
    noPo: head.noPo,
    namaPenerima: head.namaPenerima,
    alamat: head.alamat,
    fileName: head.fileName,
    fileUrl: head.fileUrl.startsWith("http") ? head.fileUrl : "",
    kendaraanDriver: head.kendaraanDriver,
    catatan: head.catatan,
    lineStatus: statuses.has("CEK") ? "CEK" : head.status || "OK",
    lines,
  };
}

export type OcrSheetHeaderPatch = {
  gudang?: string;
  tanggal?: string;
  noSuratJalan?: string;
  noKendaraan?: string;
  noPo?: string;
  namaPenerima?: string;
  alamat?: string;
  kendaraanDriver?: string;
  catatan?: string;
};

export type OcrSheetLinePatch = {
  sheetRow: number;
  banyaknya?: string;
  isi?: string;
  namaBarang?: string;
  jumlah?: string;
  keterangan?: string;
  status?: string;
};

export async function saveOcrSheetDocumentEdits(params: {
  docKey: string;
  header?: OcrSheetHeaderPatch;
  lines?: OcrSheetLinePatch[];
}): Promise<OcrSheetDocumentDetail> {
  const rawKey = decodeOcrSheetDocKey(params.docKey);
  const { config, sheets, sheetTab, rows } = await readSheetMatrix();

  const current = await getOcrSheetDocumentDetail(params.docKey);
  const lineByRow = new Map(current.lines.map((l) => [l.sheetRow, { ...l }]));

  const applyHeader = (line: OcrSheetLine) => {
    if (!params.header) return;
    if (params.header.gudang !== undefined) line.gudang = params.header.gudang;
    if (params.header.tanggal !== undefined) line.tanggal = params.header.tanggal;
    if (params.header.noSuratJalan !== undefined) line.noSuratJalan = params.header.noSuratJalan;
    if (params.header.noKendaraan !== undefined) line.noKendaraan = params.header.noKendaraan;
    if (params.header.noPo !== undefined) line.noPo = params.header.noPo;
    if (params.header.namaPenerima !== undefined) line.namaPenerima = params.header.namaPenerima;
    if (params.header.alamat !== undefined) line.alamat = params.header.alamat;
    if (params.header.kendaraanDriver !== undefined) line.kendaraanDriver = params.header.kendaraanDriver;
    if (params.header.catatan !== undefined) line.catatan = params.header.catatan;
  };

  for (const patch of params.lines ?? []) {
    const line = lineByRow.get(patch.sheetRow);
    if (!line) continue;
    if (patch.banyaknya !== undefined) line.banyaknya = patch.banyaknya;
    if (patch.isi !== undefined) line.isi = patch.isi;
    if (patch.namaBarang !== undefined) line.namaBarang = patch.namaBarang;
    if (patch.jumlah !== undefined) line.jumlah = patch.jumlah;
    if (patch.keterangan !== undefined) line.keterangan = patch.keterangan;
    if (patch.status !== undefined) line.status = patch.status.trim().toUpperCase();
    else
      line.status = recomputeOcrSheetLineStatus({
        banyaknya: line.banyaknya,
        isi: line.isi,
        jumlah: line.jumlah,
        namaBarang: line.namaBarang,
      });
    applyHeader(line);
    lineByRow.set(patch.sheetRow, line);
  }

  if (params.header && (!params.lines || params.lines.length === 0)) {
    for (const [sheetRow, line] of lineByRow) {
      applyHeader(line);
      lineByRow.set(sheetRow, line);
    }
  }

  const data: { range: string; values: string[][] }[] = [];
  for (let i = 0; i < rows.length; i += 1) {
    const row = rows[i];
    if (i === 0 && firstRowIsOcrHeader(row)) continue;
    if (!sheetRowMatchesDocKey(row ?? [], rawKey)) continue;
    const sheetRow = i + 1;
    const merged = lineByRow.get(sheetRow);
    if (!merged) continue;
    data.push({
      range: ocrSheetRowRange(sheetTab, sheetRow),
      values: [rowFromLine(merged)],
    });
  }

  if (data.length === 0) {
    throw new Error("Tidak ada baris yang diperbarui");
  }

  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId: config.sheetId,
    requestBody: {
      valueInputOption: "USER_ENTERED",
      data,
    },
  });

  return getOcrSheetDocumentDetail(params.docKey);
}
