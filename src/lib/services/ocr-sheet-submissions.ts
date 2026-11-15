import "server-only";

import { getGoogleExportConfigOptional } from "@/lib/providers/google-workspace/config";
import { mapOcrSheetRow } from "@/lib/providers/google-workspace/ocr-sheet-columns";
import { listExistingOcrDataTabs, readOcrSheetTabs } from "@/lib/services/ocr-sheet-matrix";
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

  const tabs = await listExistingOcrDataTabs(config);
  const { rowsByTab } = await readOcrSheetTabs(config, tabs);
  const out: SubmissionHistoryRow[] = [];

  for (const rows of rowsByTab.values()) {
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
  }

  return out.reverse();
}
