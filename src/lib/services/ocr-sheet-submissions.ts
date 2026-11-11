import "server-only";

import { google } from "googleapis";
import { createGoogleAuthClient, resolveSheetTabName } from "@/lib/providers/google-workspace/client";
import { getGoogleExportConfigOptional } from "@/lib/providers/google-workspace/config";
import { mapOcrSheetRow, ocrSheetFullColumnsRange } from "@/lib/providers/google-workspace/ocr-sheet-columns";
import { encodeOcrSheetDocKey, firstRowIsOcrHeader, isMeaningfulOcrDataRow } from "@/lib/services/ocr-sheet-keys";
import { parseRevisionLinks } from "@/lib/surat-jalan/revision-links";
import { normalizeOcrReviewStatus } from "@/lib/ocr-review/workflow-status";
import {
  submissionDocRawKey,
  type SubmissionHistoryRow,
} from "@/lib/services/ocr-sheet-submissions-shared";

export type { SubmissionHistoryRow } from "@/lib/services/ocr-sheet-submissions-shared";
export {
  filterRowsForSupplier,
  submissionDocRawKey,
  supplierCanConfirmReceipt,
} from "@/lib/services/ocr-sheet-submissions-shared";

export async function listOcrSheetSubmissionRows(): Promise<SubmissionHistoryRow[]> {
  const config = getGoogleExportConfigOptional();
  if (!config) return [];

  const auth = createGoogleAuthClient(config);
  const sheets = google.sheets({ version: "v4", auth });
  const sheetTab = await resolveSheetTabName(config);
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: config.sheetId,
    range: ocrSheetFullColumnsRange(sheetTab),
  });

  const rows = res.data.values ?? [];
  const out: SubmissionHistoryRow[] = [];

  for (let i = 0; i < rows.length; i += 1) {
    const row = rows[i] ?? [];
    if (firstRowIsOcrHeader(row)) continue;
    if (!isMeaningfulOcrDataRow(row)) continue;
    const fields = mapOcrSheetRow(row);
    const rowKey = [
      fields.noSuratJalan,
      fields.tanggal,
      fields.namaBarang,
      fields.jumlah,
      String(i),
    ].join("|");
    out.push({
      ...fields,
      rowKey,
      docKey: encodeOcrSheetDocKey(submissionDocRawKey(fields)),
      revisionLinks: parseRevisionLinks(fields.linkRevisi),
      statusReview: normalizeOcrReviewStatus(fields.statusReview),
    });
  }

  return out.reverse();
}
