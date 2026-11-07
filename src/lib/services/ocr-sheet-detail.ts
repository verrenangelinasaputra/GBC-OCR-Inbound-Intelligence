import { google } from "googleapis";
import { createGoogleAuthClient, resolveSheetTabName } from "@/lib/providers/google-workspace/client";
import { getGoogleExportConfigOptional } from "@/lib/providers/google-workspace";
import { recomputeOcrSheetLineStatus } from "@/lib/providers/google-workspace/google-sj-export-rows";
import {
  decodeOcrSheetDocKey,
  firstRowIsOcrHeader,
  sheetRowMatchesDocKey,
} from "@/lib/services/ocr-sheet-keys";

export type OcrSheetLine = {
  sheetRow: number;
  exportTimestamp: string;
  tanggal: string;
  noSuratJalan: string;
  noKendaraan: string;
  noPo: string;
  namaPenerima: string;
  alamat: string;
  banyaknya: string;
  isi: string;
  namaBarang: string;
  jumlah: string;
  keterangan: string;
  fileName: string;
  fileUrl: string;
  status: string;
};

export type OcrSheetDocumentDetail = {
  docKey: string;
  exportTimestamp: string;
  tanggal: string;
  noSuratJalan: string;
  noKendaraan: string;
  noPo: string;
  namaPenerima: string;
  alamat: string;
  fileName: string;
  fileUrl: string;
  lineStatus: string;
  lines: OcrSheetLine[];
};

function lineFromRow(sheetRow: number, row: string[]): OcrSheetLine {
  return {
    sheetRow,
    exportTimestamp: String(row[0] ?? ""),
    tanggal: String(row[1] ?? ""),
    noSuratJalan: String(row[2] ?? ""),
    noKendaraan: String(row[3] ?? ""),
    noPo: String(row[4] ?? ""),
    namaPenerima: String(row[5] ?? ""),
    alamat: String(row[6] ?? ""),
    banyaknya: String(row[7] ?? ""),
    isi: String(row[8] ?? ""),
    namaBarang: String(row[9] ?? ""),
    jumlah: String(row[10] ?? ""),
    keterangan: String(row[11] ?? ""),
    fileName: String(row[12] ?? ""),
    fileUrl: String(row[13] ?? ""),
    status: String(row[14] ?? "").trim() || "OK",
  };
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
  return [
    line.exportTimestamp,
    line.tanggal,
    line.noSuratJalan,
    line.noKendaraan,
    line.noPo,
    line.namaPenerima,
    line.alamat,
    line.banyaknya,
    line.isi,
    line.namaBarang,
    line.jumlah,
    line.keterangan,
    line.fileName,
    line.fileUrl,
    status,
  ];
}

async function readSheetMatrix() {
  const config = getGoogleExportConfigOptional();
  if (!config) throw new Error("Google export tidak dikonfigurasi");

  const auth = createGoogleAuthClient(config);
  const sheets = google.sheets({ version: "v4", auth });
  const sheetTab = await resolveSheetTabName(config);
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: config.sheetId,
    range: `${sheetTab}!A:O`,
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
    exportTimestamp: head.exportTimestamp,
    tanggal: head.tanggal,
    noSuratJalan: head.noSuratJalan,
    noKendaraan: head.noKendaraan,
    noPo: head.noPo,
    namaPenerima: head.namaPenerima,
    alamat: head.alamat,
    fileName: head.fileName,
    fileUrl: head.fileUrl.startsWith("http") ? head.fileUrl : "",
    lineStatus: statuses.has("CEK") ? "CEK" : head.status || "OK",
    lines,
  };
}

export type OcrSheetHeaderPatch = {
  tanggal?: string;
  noSuratJalan?: string;
  noKendaraan?: string;
  noPo?: string;
  namaPenerima?: string;
  alamat?: string;
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
    if (params.header) {
      if (params.header.tanggal !== undefined) line.tanggal = params.header.tanggal;
      if (params.header.noSuratJalan !== undefined) line.noSuratJalan = params.header.noSuratJalan;
      if (params.header.noKendaraan !== undefined) line.noKendaraan = params.header.noKendaraan;
      if (params.header.noPo !== undefined) line.noPo = params.header.noPo;
      if (params.header.namaPenerima !== undefined) line.namaPenerima = params.header.namaPenerima;
      if (params.header.alamat !== undefined) line.alamat = params.header.alamat;
    }
    lineByRow.set(patch.sheetRow, line);
  }

  if (params.header && (!params.lines || params.lines.length === 0)) {
    for (const [sheetRow, line] of lineByRow) {
      if (params.header.tanggal !== undefined) line.tanggal = params.header.tanggal;
      if (params.header.noSuratJalan !== undefined) line.noSuratJalan = params.header.noSuratJalan;
      if (params.header.noKendaraan !== undefined) line.noKendaraan = params.header.noKendaraan;
      if (params.header.noPo !== undefined) line.noPo = params.header.noPo;
      if (params.header.namaPenerima !== undefined) line.namaPenerima = params.header.namaPenerima;
      if (params.header.alamat !== undefined) line.alamat = params.header.alamat;
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
      range: `${sheetTab}!A${sheetRow}:O${sheetRow}`,
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
