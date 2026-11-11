import { google } from "googleapis";
import {
  appendRowsToSheet,
  createGoogleAuthClient,
  resolveSheetTabName,
} from "@/lib/providers/google-workspace/client";
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
  pickDominantReviewStatus,
  normalizeOcrReviewStatus,
} from "@/lib/ocr-review/workflow-status";
import { parseRevisionLinks } from "@/lib/surat-jalan/revision-links";
import { normalizeSampleItemTag, type SampleItemTag } from "@/lib/surat-jalan/sample-item-tag";
import {
  decodeOcrSheetDocKey,
  firstRowIsOcrHeader,
  sheetRowMatchesDocKey,
} from "@/lib/services/ocr-sheet-keys";

export type OcrSheetLine = OcrSheetRowFields & { sheetRow: number };

export type OcrSheetDocumentDetail = {
  docKey: string;
  supplier: string;
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
  statusReview: string;
  linkRevisi: string;
  revisionLinks: string[];
  sampleType: SampleItemTag;
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
  const meta = await sheets.spreadsheets.get({
    spreadsheetId: config.sheetId,
    fields: "sheets.properties(sheetId,title)",
  });
  const sheetGridId = meta.data.sheets?.find((s) => s.properties?.title === sheetTab)?.properties
    ?.sheetId;
  if (sheetGridId == null) throw new Error("Tab spreadsheet tidak ditemukan");

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: config.sheetId,
    range: ocrSheetFullColumnsRange(sheetTab),
  });
  return { config, sheets, sheetTab, sheetGridId, rows: res.data.values ?? [] };
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
  const reviewStatuses = lines.map((l) => normalizeOcrReviewStatus(l.statusReview));
  const dominantReview = pickDominantReviewStatus(reviewStatuses);
  const sampleType = lines.some(
    (l) => normalizeSampleItemTag(l.sampleType) === "BARANG SAMPLE"
  )
    ? "BARANG SAMPLE"
    : "BUKAN BARANG SAMPLE";
  return {
    docKey,
    supplier: head.supplier,
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
    statusReview: dominantReview,
    linkRevisi: head.linkRevisi?.trim() ?? "",
    revisionLinks: parseRevisionLinks(head.linkRevisi),
    sampleType,
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
  sampleType?: string;
};

/** Baris produk baru (belum punya nomor baris sheet). */
export type OcrSheetNewLineInput = {
  banyaknya?: string;
  isi?: string;
  namaBarang?: string;
  jumlah?: string;
  keterangan?: string;
  status?: string;
  sampleType?: string;
};

export async function saveOcrSheetDocumentEdits(params: {
  docKey: string;
  header?: OcrSheetHeaderPatch;
  lines?: OcrSheetLinePatch[];
  newLines?: OcrSheetNewLineInput[];
  deleteSheetRows?: number[];
}): Promise<OcrSheetDocumentDetail> {
  const rawKey = decodeOcrSheetDocKey(params.docKey);
  let { config, sheets, sheetTab, sheetGridId, rows } = await readSheetMatrix();

  const current = await getOcrSheetDocumentDetail(params.docKey);
  const docSheetRows = new Set(current.lines.map((l) => l.sheetRow));

  const deleteRows = [...new Set((params.deleteSheetRows ?? []).filter((n) => n > 1))]
    .filter((rowNum) => docSheetRows.has(rowNum))
    .sort((a, b) => b - a);
  if (deleteRows.length > 0 && current.lines.length - deleteRows.length < 1) {
    throw new Error("Minimal harus ada satu baris item di Surat Jalan");
  }
  if (deleteRows.length > 0) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: config.sheetId,
      requestBody: {
        requests: deleteRows.map((rowNum) => ({
          deleteDimension: {
            range: {
              sheetId: sheetGridId,
              dimension: "ROWS",
              startIndex: rowNum - 1,
              endIndex: rowNum,
            },
          },
        })),
      },
    });
    ({ config, sheets, sheetTab, sheetGridId, rows } = await readSheetMatrix());
  }

  const refreshed = await getOcrSheetDocumentDetail(params.docKey);
  const lineByRow = new Map(refreshed.lines.map((l) => [l.sheetRow, { ...l }]));

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
    if (patch.sampleType !== undefined) {
      line.sampleType = normalizeSampleItemTag(patch.sampleType);
    }
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

  if (data.length > 0) {
    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId: config.sheetId,
      requestBody: {
        valueInputOption: "USER_ENTERED",
        data,
      },
    });
  }

  const head = refreshed.lines[0];
  const newRowsInput = params.newLines ?? [];
  if (newRowsInput.length > 0 && head) {
    const values: string[][] = [];
    for (const input of newRowsInput) {
      let status = (input.status ?? "OK").trim().toUpperCase();
      if (status !== "OK" && status !== "CEK") {
        status = recomputeOcrSheetLineStatus({
          banyaknya: input.banyaknya ?? "",
          isi: input.isi ?? "",
          jumlah: input.jumlah ?? "",
          namaBarang: input.namaBarang ?? "",
        });
      }
      const draft: OcrSheetLine = {
        ...head,
        banyaknya: input.banyaknya ?? "",
        isi: input.isi ?? "",
        namaBarang: input.namaBarang ?? "",
        jumlah: input.jumlah ?? "",
        keterangan: input.keterangan ?? "",
        status,
        sampleType: normalizeSampleItemTag(input.sampleType ?? head.sampleType),
        sheetRow: 0,
      };
      applyHeader(draft);
      values.push(rowFromLine(draft));
    }
    await appendRowsToSheet({ config, rows: values });
  }

  if (data.length === 0 && newRowsInput.length === 0 && deleteRows.length === 0) {
    throw new Error("Tidak ada perubahan untuk disimpan");
  }

  return getOcrSheetDocumentDetail(params.docKey);
}
