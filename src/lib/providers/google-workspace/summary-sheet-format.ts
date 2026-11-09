import type { sheets_v4 } from "googleapis";

const NAVY = { red: 0.12, green: 0.23, blue: 0.54 };
const WHITE = { red: 1, green: 1, blue: 1 };
const SLATE = { red: 0.85, green: 0.89, blue: 0.94 };
const INPUT_FILL = { red: 1, green: 0.98, blue: 0.85 };
const KPI_FILL = { red: 0.97, green: 0.98, blue: 1 };

/** Dashboard ringkas — tanpa QUERY spill (laporan di tab terpisah). */
export async function applySummaryDashboardFormatting(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  sheetId: number
): Promise<void> {
  const requests: object[] = [
    {
      mergeCells: {
        range: { sheetId, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: 9 },
        mergeType: "MERGE_ALL",
      },
    },
    {
      mergeCells: {
        range: { sheetId, startRowIndex: 1, endRowIndex: 2, startColumnIndex: 0, endColumnIndex: 9 },
        mergeType: "MERGE_ALL",
      },
    },
    {
      repeatCell: {
        range: { sheetId, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: 9 },
        cell: {
          userEnteredFormat: {
            backgroundColor: NAVY,
            textFormat: { foregroundColor: WHITE, bold: true, fontSize: 16 },
            horizontalAlignment: "CENTER",
            verticalAlignment: "MIDDLE",
          },
        },
        fields: "userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment)",
      },
    },
    {
      repeatCell: {
        range: { sheetId, startRowIndex: 1, endRowIndex: 2, startColumnIndex: 0, endColumnIndex: 9 },
        cell: {
          userEnteredFormat: {
            textFormat: {
              foregroundColor: { red: 0.45, green: 0.48, blue: 0.55 },
              fontSize: 10,
              italic: true,
            },
            horizontalAlignment: "CENTER",
          },
        },
        fields: "userEnteredFormat(textFormat,horizontalAlignment)",
      },
    },
    {
      mergeCells: {
        range: { sheetId, startRowIndex: 3, endRowIndex: 4, startColumnIndex: 0, endColumnIndex: 1 },
        mergeType: "MERGE_ALL",
      },
    },
    {
      repeatCell: {
        range: { sheetId, startRowIndex: 3, endRowIndex: 9, startColumnIndex: 0, endColumnIndex: 2 },
        cell: {
          userEnteredFormat: {
            backgroundColor: SLATE,
            textFormat: { bold: true, fontSize: 10 },
            verticalAlignment: "MIDDLE",
          },
        },
        fields: "userEnteredFormat(backgroundColor,textFormat,verticalAlignment)",
      },
    },
    {
      repeatCell: {
        range: { sheetId, startRowIndex: 4, endRowIndex: 6, startColumnIndex: 1, endColumnIndex: 2 },
        cell: {
          userEnteredFormat: {
            backgroundColor: INPUT_FILL,
            numberFormat: { type: "DATE", pattern: "dd/MM/yyyy" },
          },
        },
        fields: "userEnteredFormat(backgroundColor,numberFormat)",
      },
    },
    {
      repeatCell: {
        range: { sheetId, startRowIndex: 6, endRowIndex: 9, startColumnIndex: 1, endColumnIndex: 2 },
        cell: {
          userEnteredFormat: { backgroundColor: INPUT_FILL },
        },
        fields: "userEnteredFormat.backgroundColor",
      },
    },
    {
      mergeCells: {
        range: { sheetId, startRowIndex: 10, endRowIndex: 11, startColumnIndex: 0, endColumnIndex: 3 },
        mergeType: "MERGE_ALL",
      },
    },
    {
      repeatCell: {
        range: { sheetId, startRowIndex: 10, endRowIndex: 14, startColumnIndex: 0, endColumnIndex: 4 },
        cell: {
          userEnteredFormat: {
            backgroundColor: KPI_FILL,
            textFormat: { fontSize: 10 },
            verticalAlignment: "MIDDLE",
          },
        },
        fields: "userEnteredFormat(backgroundColor,textFormat,verticalAlignment)",
      },
    },
    {
      repeatCell: {
        range: { sheetId, startRowIndex: 10, endRowIndex: 11, startColumnIndex: 0, endColumnIndex: 4 },
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
        range: { sheetId, startRowIndex: 11, endRowIndex: 14, startColumnIndex: 1, endColumnIndex: 2 },
        cell: {
          userEnteredFormat: {
            textFormat: { bold: true, fontSize: 12 },
            horizontalAlignment: "RIGHT",
            numberFormat: { type: "NUMBER", pattern: "#,##0" },
          },
        },
        fields: "userEnteredFormat(textFormat,horizontalAlignment,numberFormat)",
      },
    },
    {
      repeatCell: {
        range: { sheetId, startRowIndex: 11, endRowIndex: 14, startColumnIndex: 3, endColumnIndex: 4 },
        cell: {
          userEnteredFormat: {
            textFormat: { bold: true, fontSize: 12 },
            horizontalAlignment: "RIGHT",
            numberFormat: { type: "NUMBER", pattern: "#,##0" },
          },
        },
        fields: "userEnteredFormat(textFormat,horizontalAlignment,numberFormat)",
      },
    },
    {
      mergeCells: {
        range: { sheetId, startRowIndex: 15, endRowIndex: 16, startColumnIndex: 0, endColumnIndex: 3 },
        mergeType: "MERGE_ALL",
      },
    },
    {
      repeatCell: {
        range: { sheetId, startRowIndex: 15, endRowIndex: 21, startColumnIndex: 0, endColumnIndex: 4 },
        cell: {
          userEnteredFormat: {
            backgroundColor: { red: 0.98, green: 0.99, blue: 1 },
            textFormat: { fontSize: 11 },
            verticalAlignment: "MIDDLE",
          },
        },
        fields: "userEnteredFormat(backgroundColor,textFormat,verticalAlignment)",
      },
    },
    {
      repeatCell: {
        range: { sheetId, startRowIndex: 15, endRowIndex: 16, startColumnIndex: 0, endColumnIndex: 4 },
        cell: {
          userEnteredFormat: {
            backgroundColor: SLATE,
            textFormat: { bold: true, fontSize: 11 },
          },
        },
        fields: "userEnteredFormat(backgroundColor,textFormat)",
      },
    },
    {
      repeatCell: {
        range: { sheetId, startRowIndex: 16, endRowIndex: 21, startColumnIndex: 1, endColumnIndex: 4 },
        cell: {
          userEnteredFormat: {
            textFormat: { fontSize: 11, foregroundColor: { red: 0.1, green: 0.25, blue: 0.55 } },
          },
        },
        fields: "userEnteredFormat.textFormat",
      },
    },
    {
      updateBorders: {
        range: { sheetId, startRowIndex: 3, endRowIndex: 9, startColumnIndex: 0, endColumnIndex: 2 },
        top: { style: "SOLID", width: 1, color: SLATE },
        bottom: { style: "SOLID", width: 1, color: SLATE },
        left: { style: "SOLID", width: 1, color: SLATE },
        right: { style: "SOLID", width: 1, color: SLATE },
        innerHorizontal: { style: "SOLID", width: 1, color: { red: 0.9, green: 0.92, blue: 0.94 } },
        innerVertical: { style: "SOLID", width: 1, color: { red: 0.9, green: 0.92, blue: 0.94 } },
      },
    },
    {
      updateBorders: {
        range: { sheetId, startRowIndex: 10, endRowIndex: 14, startColumnIndex: 0, endColumnIndex: 4 },
        top: { style: "SOLID", width: 1, color: NAVY },
        bottom: { style: "SOLID", width: 1, color: NAVY },
        left: { style: "SOLID", width: 1, color: NAVY },
        right: { style: "SOLID", width: 1, color: NAVY },
        innerHorizontal: { style: "SOLID", width: 1, color: { red: 0.88, green: 0.9, blue: 0.95 } },
        innerVertical: { style: "SOLID", width: 1, color: { red: 0.88, green: 0.9, blue: 0.95 } },
      },
    },
    {
      updateSheetProperties: {
        properties: {
          sheetId,
          gridProperties: { frozenRowCount: 2, hideGridlines: true },
        },
        fields: "gridProperties.frozenRowCount,gridProperties.hideGridlines",
      },
    },
    ...[200, 120, 200, 120, 80, 80, 80, 80, 80].map((pixelSize, startIndex) => ({
      updateDimensionProperties: {
        range: { sheetId, dimension: "COLUMNS", startIndex, endIndex: startIndex + 1 },
        properties: { pixelSize },
        fields: "pixelSize",
      },
    })),
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
