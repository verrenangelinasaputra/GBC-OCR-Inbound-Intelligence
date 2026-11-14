import type ExcelJS from "exceljs";
import { ACCURATE_TRANSACTION_ITEM_HEADERS } from "@/lib/dbm/accurate-transaction-import";

/** Lebar kolom dari template Accurate `transaction-item-import-item-id.xlsx`. */
export const ACCURATE_COLUMN_WIDTHS: number[] = [
  15.21875, 7.6640625, 8.21875, 11, 15.109375, 13.21875, 16, 22.33203125, 21.109375, 20,
  20.88671875, 13, 13, 13, 13, 13, 13, 13, 13, 22.33203125, 13, 13, 13, 13, 13, 17.77734375,
  18.33203125, 13, 13, 13, 13, 13, 13, 13, 19.6640625, 19.88671875, 13,
];

const FILL_PRIMARY = "FF4472C4";
const FILL_DEPT = "FF4F81BD";
const FILL_KUSTOM = "FF92D050";

const thin = { style: "thin" as const };

function headerFillArgb(col1: number): string {
  if (col1 >= 8 && col1 <= 10) return FILL_DEPT;
  if (col1 >= 11) return FILL_KUSTOM;
  return FILL_PRIMARY;
}

function headerFontArgb(col1: number): string {
  if (col1 === 2 || col1 === 4) return "FFFF0000";
  if (col1 === 3) return "FF000000";
  return "FFFFFFFF";
}

function solidFill(argb: string): ExcelJS.Fill {
  return { type: "pattern", pattern: "solid", fgColor: { argb } };
}

function allBorders(): Partial<ExcelJS.Borders> {
  return { top: thin, left: thin, bottom: thin, right: thin };
}

export function styleAccurateTransactionImportSheet(sheet: ExcelJS.Worksheet, dataRowCount: number): void {
  const colCount = ACCURATE_TRANSACTION_ITEM_HEADERS.length;

  for (let c = 0; c < colCount; c += 1) {
    const col1 = c + 1;
    const letter = sheet.getColumn(col1).letter;
    const width = ACCURATE_COLUMN_WIDTHS[c] ?? 13;
    sheet.getColumn(col1).width = width;

    const headerCell = sheet.getCell(1, col1);
    headerCell.value = ACCURATE_TRANSACTION_ITEM_HEADERS[c];
    headerCell.fill = solidFill(headerFillArgb(col1));
    headerCell.font = {
      name: "Calibri",
      size: 14,
      bold: true,
      color: { argb: headerFontArgb(col1) },
    };
    headerCell.alignment = { vertical: "middle", horizontal: "left", wrapText: true };
    headerCell.border = allBorders();
  }

  sheet.getRow(1).height = 18;

  for (let r = 2; r <= dataRowCount + 1; r += 1) {
    sheet.getRow(r).height = 15.6;
    for (let c = 1; c <= colCount; c += 1) {
      const cell = sheet.getCell(r, c);
      const fontSize = c === 1 || c === 2 ? 12 : 11;
      cell.font = { name: "Calibri", size: fontSize, color: { argb: "FF000000" } };
      cell.alignment = { vertical: "middle", horizontal: "left", wrapText: c === 8 };
      cell.border = allBorders();
      if (c === 2 || c === 4 || (c >= 5 && c <= 6) || (c >= 26 && c <= 35)) {
        if (typeof cell.value === "number") {
          cell.numFmt = c === 5 || c === 6 ? "#,##0" : "0";
        }
      }
    }
  }

  sheet.views = [{ state: "frozen", xSplit: 0, ySplit: 1, topLeftCell: "A2", activeCell: "A2" }];
}