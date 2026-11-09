import type { sheets_v4 } from "googleapis";

export const SUMMARY_REPORT_TABS = {
  weekly: "Ringkasan Mingguan",
  items: "Ringkasan Item",
  delivery: "Detail Pengiriman",
  supplier: "Ringkasan Supplier",
  warehouse: "Ringkasan Gudang",
} as const;

const NAVY = { red: 0.12, green: 0.23, blue: 0.54 };
const WHITE = { red: 1, green: 1, blue: 1 };

export type SummaryReportDefinition = {
  tab: (typeof SUMMARY_REPORT_TABS)[keyof typeof SUMMARY_REPORT_TABS];
  title: string;
  querySelect: string;
  titleMergeCols: number;
};

export const SUMMARY_REPORTS: SummaryReportDefinition[] = [
  {
    tab: SUMMARY_REPORT_TABS.weekly,
    title: "Inbound per minggu (total unit)",
    querySelect: "select J, sum(G) where G > 0 and J is not null group by J",
    titleMergeCols: 4,
  },
  {
    tab: SUMMARY_REPORT_TABS.items,
    title: "Unit per produk & gudang",
    querySelect:
      "select J, E, A, sum(G), H where E is not null and G > 0 group by J, E, A, H",
    titleMergeCols: 6,
  },
  {
    tab: SUMMARY_REPORT_TABS.delivery,
    title: "Detail baris pengiriman",
    querySelect:
      "select C, J, A, B, D, E, G, H where C is not null and G > 0 order by C desc",
    titleMergeCols: 8,
  },
  {
    tab: SUMMARY_REPORT_TABS.supplier,
    title: "Total unit per supplier",
    querySelect: "select B, sum(G) where B is not null and G > 0 group by B",
    titleMergeCols: 3,
  },
  {
    tab: SUMMARY_REPORT_TABS.warehouse,
    title: "Total unit per gudang",
    querySelect: "select A, sum(G) where A is not null and G > 0 group by A",
    titleMergeCols: 3,
  },
];

/** Header + QUERY di A2, mengikuti filter tab Summary. */
export async function applySummaryReportTab(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  sheetId: number,
  report: SummaryReportDefinition,
  queryA2: string
): Promise<void> {
  const mergeCols = Math.max(report.titleMergeCols, 2);
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `'${report.tab}'!A1:A2`,
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [[report.title], [queryA2]],
    },
  });

  const requests: object[] = [
    {
      mergeCells: {
        range: {
          sheetId,
          startRowIndex: 0,
          endRowIndex: 1,
          startColumnIndex: 0,
          endColumnIndex: mergeCols,
        },
        mergeType: "MERGE_ALL",
      },
    },
    {
      repeatCell: {
        range: {
          sheetId,
          startRowIndex: 0,
          endRowIndex: 1,
          startColumnIndex: 0,
          endColumnIndex: mergeCols,
        },
        cell: {
          userEnteredFormat: {
            backgroundColor: NAVY,
            textFormat: { foregroundColor: WHITE, bold: true, fontSize: 12 },
            horizontalAlignment: "LEFT",
            verticalAlignment: "MIDDLE",
          },
        },
        fields: "userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment)",
      },
    },
    {
      updateSheetProperties: {
        properties: {
          sheetId,
          gridProperties: { frozenRowCount: 1, hideGridlines: false },
        },
        fields: "gridProperties.frozenRowCount",
      },
    },
    ...(report.tab === SUMMARY_REPORT_TABS.delivery
      ? [
          {
            repeatCell: {
              range: {
                sheetId,
                startRowIndex: 1,
                endRowIndex: 4000,
                startColumnIndex: 0,
                endColumnIndex: 1,
              },
              cell: {
                userEnteredFormat: { numberFormat: { type: "DATE", pattern: "dd/MM/yyyy" } },
              },
              fields: "userEnteredFormat.numberFormat",
            },
          },
        ]
      : []),
    ...[110, 200, 120, 130, 130, 90, 80, 72].map((pixelSize, startIndex) => ({
      updateDimensionProperties: {
        range: { sheetId, dimension: "COLUMNS", startIndex, endIndex: startIndex + 1 },
        properties: { pixelSize },
        fields: "pixelSize",
      },
    })),
    {
      addBanding: {
        bandedRange: {
          range: {
            sheetId,
            startRowIndex: 1,
            endRowIndex: 2000,
            startColumnIndex: 0,
            endColumnIndex: mergeCols,
          },
          rowProperties: {
            headerColor: NAVY,
            firstBandColor: { red: 1, green: 1, blue: 1 },
            secondBandColor: { red: 0.96, green: 0.97, blue: 0.99 },
          },
        },
      },
    },
  ];

  try {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: { requests },
    });
  } catch {
    /* banding duplikat — abaikan */
  }
}
