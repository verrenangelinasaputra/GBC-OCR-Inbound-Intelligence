import type { sheets_v4 } from "googleapis";
import { OCR_COL, OCR_SHEET_COLUMN_COUNT } from "./ocr-sheet-columns";

function columnWidthRequests(sheetId: number) {
  const widths = [120, 140, 105, 95, 115, 100, 90, 140, 160, 90, 90, 200, 90, 160, 200, 220, 120, 160, 70];
  return widths.map((pixelSize, startIndex) => ({
    updateDimensionProperties: {
      range: {
        sheetId,
        dimension: "COLUMNS",
        startIndex,
        endIndex: startIndex + 1,
      },
      properties: { pixelSize },
      fields: "pixelSize",
    },
  }));
}

/** Header berwarna, zebra striping, filter, conditional OK/CEK. */
export async function applyOcrSheetFormatting(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  sheetId: number
): Promise<void> {

  const requests: object[] = [
    {
      repeatCell: {
        range: {
          sheetId,
          startRowIndex: 0,
          endRowIndex: 1,
          startColumnIndex: 0,
          endColumnIndex: OCR_SHEET_COLUMN_COUNT,
        },
        cell: {
          userEnteredFormat: {
            backgroundColor: { red: 0.12, green: 0.23, blue: 0.54 },
            textFormat: {
              foregroundColor: { red: 1, green: 1, blue: 1 },
              bold: true,
              fontSize: 10,
            },
            horizontalAlignment: "CENTER",
            verticalAlignment: "MIDDLE",
            wrapStrategy: "WRAP",
          },
        },
        fields:
          "userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment,wrapStrategy)",
      },
    },
    {
      updateSheetProperties: {
        properties: {
          sheetId,
          gridProperties: { frozenRowCount: 1 },
        },
        fields: "gridProperties.frozenRowCount",
      },
    },
    ...columnWidthRequests(sheetId),
    {
      setBasicFilter: {
        filter: {
          range: {
            sheetId,
            startRowIndex: 0,
            endRowIndex: 5000,
            startColumnIndex: 0,
            endColumnIndex: OCR_SHEET_COLUMN_COUNT,
          },
        },
      },
    },
    {
      addBanding: {
        bandedRange: {
          range: {
            sheetId,
            startRowIndex: 1,
            endRowIndex: 5000,
            startColumnIndex: 0,
            endColumnIndex: OCR_SHEET_COLUMN_COUNT,
          },
          rowProperties: {
            headerColor: { red: 0.12, green: 0.23, blue: 0.54 },
            firstBandColor: { red: 1, green: 1, blue: 1 },
            secondBandColor: { red: 0.95, green: 0.97, blue: 0.99 },
          },
        },
      },
    },
    {
      addConditionalFormatRule: {
        rule: {
          ranges: [
            {
              sheetId,
              startRowIndex: 1,
              endRowIndex: 5000,
              startColumnIndex: OCR_COL.STATUS,
              endColumnIndex: OCR_COL.STATUS + 1,
            },
          ],
          booleanRule: {
            condition: {
              type: "TEXT_EQ",
              values: [{ userEnteredValue: "OK" }],
            },
            format: {
              backgroundColor: { red: 0.85, green: 0.95, blue: 0.87 },
              textFormat: { bold: true, foregroundColor: { red: 0.1, green: 0.45, blue: 0.2 } },
            },
          },
        },
        index: 0,
      },
    },
    {
      addConditionalFormatRule: {
        rule: {
          ranges: [
            {
              sheetId,
              startRowIndex: 1,
              endRowIndex: 5000,
              startColumnIndex: OCR_COL.STATUS,
              endColumnIndex: OCR_COL.STATUS + 1,
            },
          ],
          booleanRule: {
            condition: {
              type: "TEXT_EQ",
              values: [{ userEnteredValue: "CEK" }],
            },
            format: {
              backgroundColor: { red: 1, green: 0.93, blue: 0.82 },
              textFormat: { bold: true, foregroundColor: { red: 0.7, green: 0.35, blue: 0.05 } },
            },
          },
        },
        index: 1,
      },
    },
  ];

  try {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: { requests },
    });
  } catch {
    /* formatting opsional — data tetap jalan jika batch gagal (mis. banding duplikat) */
  }
}
