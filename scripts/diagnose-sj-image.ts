/** Cek baris sheet + resolusi foto Drive untuk satu no. SJ atau nama file. */
import "dotenv/config";
import { google } from "googleapis";
import {
  createGoogleAuthClient,
  findDriveFileInFolder,
  resolveAndDownloadSuratJalanImage,
  resolveSheetTabName,
} from "../src/lib/providers/google-workspace/client";
import { getGoogleExportConfigOptional } from "../src/lib/providers/google-workspace";
import { mapOcrSheetRow, ocrSheetFullColumnsRange } from "../src/lib/providers/google-workspace/ocr-sheet-columns";

const needle = process.argv[2] ?? "SG071351";

async function main() {
  const config = getGoogleExportConfigOptional();
  if (!config) {
    console.error("Google export tidak dikonfigurasi");
    process.exit(1);
  }
  console.log("Drive root:", config.driveFolderId, "| OAuth:", process.env.GOOGLE_DRIVE_UPLOAD_AUTH);

  const auth = createGoogleAuthClient(config);
  const sheets = google.sheets({ version: "v4", auth });
  const tab = await resolveSheetTabName(config);
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: config.sheetId,
    range: ocrSheetFullColumnsRange(tab),
  });
  const rows = res.data.values ?? [];

  const hits: Array<{ row: number; fields: ReturnType<typeof mapOcrSheetRow> }> = [];
  for (let i = 1; i < rows.length; i += 1) {
    const f = mapOcrSheetRow(rows[i]);
    if (
      f.noSuratJalan.includes(needle) ||
      f.fileName.includes(needle) ||
      f.fileUrl.includes(needle)
    ) {
      hits.push({ row: i + 1, fields: f });
    }
  }

  if (!hits.length) {
    console.log("Tidak ada baris sheet untuk:", needle);
    process.exit(0);
  }

  for (const h of hits) {
    console.log("\n--- Baris", h.row, "---");
    console.log("Nama File:", h.fields.fileName);
    console.log("Link Drive:", h.fields.fileUrl || "(kosong)");
    console.log("Gudang:", h.fields.gudang, "| Supplier:", h.fields.supplier);

    const byName = await findDriveFileInFolder({
      config,
      fileName: h.fields.fileName,
    });
    console.log("Cari Drive by nama file:", byName ?? "TIDAK KETEMU");

    try {
      const img = await resolveAndDownloadSuratJalanImage({
        config,
        fileUrl: h.fields.fileUrl,
        fileName: h.fields.fileName,
      });
      console.log("Download OK:", img.buffer.length, "bytes,", img.mimeType, "id:", img.fileId);
    } catch (e) {
      console.log("Download GAGAL:", e instanceof Error ? e.message : e);
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
