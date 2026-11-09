import type { sheets_v4 } from "googleapis";
import { SUMMARY_BAND_LAYOUT } from "./inbound-monitoring-layout";

const NAVY = { red: 0.12, green: 0.23, blue: 0.54 };
const WHITE = { red: 1, green: 1, blue: 1 };
const SLATE_HEADER = { red: 0.85, green: 0.89, blue: 0.94 };
const INPUT_FILL = { red: 1, green: 0.98, blue: 0.85 };

function bandHeader(sheetId: number, row0: number, startCol: number, endCol: number) {
  return {
    repeatCell: {
      range: { sheetId, startRowIndex: row0, endRowIndex: row0 + 1, startColumnIndex: startCol, endColumnIndex: endCol },
      cell: {
        userEnteredFormat: {
          backgroundColor: SLATE_HEADER,
          textFormat: { bold: true, fontSize: 11 },
          wrapStrategy: "WRAP",
        },
      },
      fields: "userEnteredFormat(backgroundColor,textFormat,wrapStrategy)",
    },
  };
}

/** Dashboard Summary: judul, filter, KPI, dan lebar kolom. */
export async function applySummaryDashboardFormatting(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  sheetId: number
): Promise<void> {
  const { headerRow, queryRow, bandColIndex } = SUMMARY_BAND_LAYOUT;
  const h = headerRow - 1;
  const q0 = queryRow - 1;

  const requests: object[] = [
    {
      mergeCells: {
        range: { sheetId, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: 6 },
        mergeType: "MERGE_ALL",
      },
    },
    {
      repeatCell: {
        range: { sheetId, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: 6 },
        cell: {
          userEnteredFormat: {
            backgroundColor: NAVY,
            textFormat: { foregroundColor: WHITE, bold: true, fontSize: 14 },
            horizontalAlignment: "CENTER",
            verticalAlignment: "MIDDLE",
          },
        },
        fields: "userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment)",
      },
    },
    {
      repeatCell: {
        range: { sheetId, startRowIndex: 1, endRowIndex: 2, startColumnIndex: 0, endColumnIndex: 6 },
        cell: {
          userEnteredFormat: {
            textFormat: {
              foregroundColor: { red: 0.4, green: 0.4, blue: 0.45 },
              fontSize: 9,
              italic: true,
            },
          },
        },
        fields: "userEnteredFormat.textFormat",
      },
    },
    {
      repeatCell: {
        range: { sheetId, startRowIndex: 3, endRowIndex: 4, startColumnIndex: 0, endColumnIndex: 2 },
        cell: {
          userEnteredFormat: {
            backgroundColor: SLATE_HEADER,
            textFormat: { bold: true, fontSize: 10 },
          },
        },
        fields: "userEnteredFormat(backgroundColor,textFormat)",
      },
    },
    {
      repeatCell: {
        range: { sheetId, startRowIndex: 4, endRowIndex: 9, startColumnIndex: 0, endColumnIndex: 1 },
        cell: {
          userEnteredFormat: {
            textFormat: { bold: true, fontSize: 10 },
            verticalAlignment: "MIDDLE",
          },
        },
        fields: "userEnteredFormat(textFormat,verticalAlignment)",
      },
    },
    {
      repeatCell: {
        range: { sheetId, startRowIndex: 4, endRowIndex: 6, startColumnIndex: 1, endColumnIndex: 2 },
        cell: {
          userEnteredFormat: {
            backgroundColor: INPUT_FILL,
            numberFormat: { type: "DATE", pattern: "dd/MM/yyyy" },
            textFormat: { fontSize: 10 },
          },
        },
        fields: "userEnteredFormat(backgroundColor,numberFormat,textFormat)",
      },
    },
    {
      repeatCell: {
        range: { sheetId, startRowIndex: 6, endRowIndex: 9, startColumnIndex: 1, endColumnIndex: 2 },
        cell: {
          userEnteredFormat: {
            backgroundColor: INPUT_FILL,
            textFormat: { fontSize: 10 },
          },
        },
        fields: "userEnteredFormat(backgroundColor,textFormat)",
      },
    },
    {
      repeatCell: {
        range: { sheetId, startRowIndex: 10, endRowIndex: 11, startColumnIndex: 0, endColumnIndex: 2 },
        cell: {
          userEnteredFormat: {
            backgroundColor: NAVY,
            textFormat: { foregroundColor: WHITE, bold: true, fontSize: 11 },
          },
        },
        fields: "userEnteredFormat(backgroundColor,textFormat)",
      },
    },
    {
      repeatCell: {
        range: { sheetId, startRowIndex: 11, endRowIndex: 17, startColumnIndex: 1, endColumnIndex: 2 },
        cell: {
          userEnteredFormat: {
            textFormat: { bold: true, fontSize: 11 },
            horizontalAlignment: "RIGHT",
            numberFormat: { type: "NUMBER", pattern: "#,##0" },
          },
        },
        fields: "userEnteredFormat(textFormat,horizontalAlignment,numberFormat)",
      },
    },
    bandHeader(sheetId, h, bandColIndex.weekly, bandColIndex.weekly + 3),
    bandHeader(sheetId, h, bandColIndex.item, bandColIndex.item + 6),
    bandHeader(sheetId, h, bandColIndex.delivery, bandColIndex.delivery + 9),
    bandHeader(sheetId, h, bandColIndex.supplier, bandColIndex.supplier + 6),
    bandHeader(sheetId, h, bandColIndex.warehouse, bandColIndex.warehouse + 5),
    {
      updateSheetProperties: {
        properties: {
          sheetId,
          gridProperties: { frozenRowCount: 3 },
        },
        fields: "gridProperties.frozenRowCount",
      },
    },
    ...[72, 72, 72, 100, 100, 100, 100, 100, 90, 80, 80, 80, 88, 72, 72, 72, 72, 72, 72, 72, 72, 88, 72, 72, 72, 72, 72, 88, 72, 72, 72, 72].map(
      (pixelSize, startIndex) => ({
        updateDimensionProperties: {
          range: { sheetId, dimension: "COLUMNS", startIndex, endIndex: startIndex + 1 },
          properties: { pixelSize },
          fields: "pixelSize",
        },
      })
    ),
    {
      repeatCell: {
        range: {
          sheetId,
          startRowIndex: q0,
          endRowIndex: 3000,
          startColumnIndex: bandColIndex.delivery,
          endColumnIndex: bandColIndex.delivery + 1,
        },
        cell: {
          userEnteredFormat: { numberFormat: { type: "DATE", pattern: "dd/MM/yyyy" } },
        },
        fields: "userEnteredFormat.numberFormat",
      },
    },
    {
      repeatCell: {
        range: {
          sheetId,
          startRowIndex: q0,
          endRowIndex: 3000,
          startColumnIndex: bandColIndex.supplier + 4,
          endColumnIndex: bandColIndex.supplier + 6,
        },
        cell: {
          userEnteredFormat: { numberFormat: { type: "DATE", pattern: "dd/MM/yyyy" } },
        },
        fields: "userEnteredFormat.numberFormat",
      },
    },
  ];

  try {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: { requests },
    });
  } catch {
    /* opsional */
  }
}
