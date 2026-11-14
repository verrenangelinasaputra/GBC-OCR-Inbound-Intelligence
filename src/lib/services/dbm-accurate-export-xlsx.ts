import "server-only";

import ExcelJS from "exceljs";
import {
  ACCURATE_TRANSACTION_ITEM_HEADERS,
  dbmRecordsToAccurateRows,
} from "@/lib/dbm/accurate-transaction-import";
import type { DbmInboundRecord } from "@/lib/dbm/dbm-inbound-types";

export async function buildAccurateImportXlsxBuffer(records: DbmInboundRecord[]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Template");
  sheet.addRow([...ACCURATE_TRANSACTION_ITEM_HEADERS]);
  for (const row of dbmRecordsToAccurateRows(records)) {
    sheet.addRow(row);
  }
  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

export function accurateExportFileName(count: number): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  const stamp = `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}`;
  return `transaction-item-import-${count}-rows_${stamp}.xlsx`;
}