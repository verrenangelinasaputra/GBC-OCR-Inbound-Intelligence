import "server-only";

import ExcelJS from "exceljs";
import { dbmRecordsToAccurateRows } from "@/lib/dbm/accurate-transaction-import";
import { styleAccurateTransactionImportSheet } from "@/lib/dbm/accurate-excel-styles";
import type { DbmInboundRecord } from "@/lib/dbm/dbm-inbound-types";

export async function buildAccurateImportXlsxBuffer(records: DbmInboundRecord[]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "GBC Inbound Intelligence";
  const sheet = workbook.addWorksheet("Template");
  const dataRows = dbmRecordsToAccurateRows(records);
  for (const row of dataRows) {
    sheet.addRow(row);
  }
  sheet.insertRow(1, []);
  styleAccurateTransactionImportSheet(sheet, dataRows.length);
  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

export function accurateExportFileName(count: number): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  const stamp = `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}`;
  return `transaction-item-import-${count}-rows_${stamp}.xlsx`;
}