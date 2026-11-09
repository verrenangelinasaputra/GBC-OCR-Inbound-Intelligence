import type { sheets_v4 } from "googleapis";
import { DATA_COMPILATION_TAB_NAME } from "@/lib/config/ocr-export-target";
import { SUPPLIER_GUDANG_OPTIONS } from "@/lib/config/supplier-gudang";
import type { GoogleExportConfig } from "./config";
import { OCR_SHEET_HEADERS } from "./google-sj-export-rows";

export const SUMMARY_TAB_NAME = "Summary";
export const DATA_CALC_TAB_NAME = "_DataCalc";

const DC = () => `'${DATA_COMPILATION_TAB_NAME.replace(/'/g, "''")}'`;

function dataCalcArrayFormula(): string {
  return `=ARRAYFORMULA(IF(LEN(${DC()}!D2:D)=0,,{${DC()}!A2:A,IF(LEN(${DC()}!B2:B)=0,"Unverified",${DC()}!B2:B),${DC()}!D2:D,${DC()}!E2:E,${DC()}!L2:L,IF(LEN(${DC()}!L2:L)=0,"Unverified","Unverified"),IFERROR(VALUE(REGEXEXTRACT(${DC()}!M2:M,"^([\\d.,]+)")),0),IFERROR(REGEXEXTRACT(${DC()}!M2:M,"\\s(\\S+)$"),"Pending"),WEEKNUM(IFERROR(DATEVALUE(${DC()}!D2:D),TODAY()),2),TEXT(IFERROR(DATEVALUE(${DC()}!D2:D),TODAY()),"yyyy")&"-W"&TEXT(WEEKNUM(IFERROR(DATEVALUE(${DC()}!D2:D),TODAY()),2),"00")}))`;
}

function gudangQueryFormula(gudang: string): string {
  const safe = gudang.replace(/'/g, "''");
  return `=QUERY(${DC()}!A1:S, "select * where Col1 = '${safe}'", 1)`;
}

function summaryFilterAndKpiRows(): string[][] {
  const calc = `'${DATA_CALC_TAB_NAME}'`;
  const filt = (extra: string) =>
    `(${calc}!C:C>=Summary!$B$5)*(${calc}!C:C<=Summary!$B$6)*(IF(Summary!$B$7="ALL",1,${calc}!A:A=Summary!$B$7))*(IF(Summary!$B$8="ALL",1,${calc}!B:B=Summary!$B$8))*(IF(LEN(Summary!$B$9)=0,1,REGEXMATCH(${calc}!E:E,"(?i)"&Summary!$B$9)))${extra}`;

  return [
    ["GBC Inbound Goods Monitoring — Management Dashboard", "", "", "", "", ""],
    ["Sumber data: tab Data Compilation (tanpa input manual di Summary)", "", "", "", "", ""],
    ["", "", "", "", "", ""],
    ["Filter", "Nilai", "", "", "", ""],
    ["Date From (Tanggal SJ)", "=DATE(YEAR(TODAY()),MONTH(TODAY()),1)", "", "", "", ""],
    ["Date To", "=TODAY()", "", "", "", ""],
    ["Warehouse", "ALL", "", "", "", ""],
    ["Supplier", "ALL", "", "", "", ""],
    ["Product contains", "", "", "", "", ""],
    ["", "", "", "", "", ""],
    ["KPI Overview", "Nilai", "", "", "", ""],
    ["Total Units Received", `=SUM(FILTER(${calc}!G:G,${filt("")}))`, "", "", "", ""],
    [
      "Total Unique Items",
      `=ROWS(UNIQUE(FILTER(${calc}!E:E,${filt(`*(${calc}!E:E<>"")`)})))`,
      "",
      "",
      "",
      "",
    ],
    [
      "Total Deliveries (unique SJ)",
      `=ROWS(UNIQUE(FILTER(${calc}!D:D,${filt(`*(${calc}!D:D<>"")`)})))`,
      "",
      "",
      "",
      "",
    ],
    [
      "Total Suppliers",
      `=ROWS(UNIQUE(FILTER(${calc}!B:B,${filt(`*(${calc}!B:B<>"")`)})))`,
      "",
      "",
      "",
      "",
    ],
    [
      "Active Warehouses",
      `=ROWS(UNIQUE(FILTER(${calc}!A:A,${filt(`*(${calc}!A:A<>"")`)})))`,
      "",
      "",
      "",
      "",
    ],
    [
      "Total Delivery Days",
      `=ROWS(UNIQUE(FILTER(${calc}!C:C,${filt(`*(${calc}!C:C<>"")`)})))`,
      "",
      "",
      "",
      "",
    ],
    ["", "", "", "", "", ""],
    ["Weekly Inbound Overview", "", "", "", "", ""],
    [
      `=QUERY(${calc}!A:J, "select J, count(E), sum(G), count(distinct D), count(distinct B) where G > 0 group by J label count(E) 'Unique Items' sum(G) 'Units' count(distinct D) 'Deliveries' count(distinct B) 'Suppliers'", 1)`,
    ],
    ["", "", "", "", "", ""],
    ["Weekly Item Summary (by product & warehouse)", "", "", "", "", ""],
    [
      `=QUERY(${calc}!A:J, "select J, F, E, A, sum(G), H, count(distinct D) where E is not null group by J, F, E, A, H label sum(G) 'Total Qty' count(distinct D) 'Deliveries'", 1)`,
    ],
    ["", "", "", "", "", ""],
    ["Delivery Breakdown (detail)", "", "", "", "", ""],
    [
      `=QUERY(${calc}!A:J, "select C, J, A, B, D, F, E, G, H where C is not null order by C desc", 1)`,
    ],
    ["", "", "", "", "", ""],
    ["Supplier Summary", "", "", "", "", ""],
    [
      `=QUERY(${calc}!A:J, "select B, count(distinct D), count(distinct E), sum(G), count(distinct A), min(C), max(C) where B is not null group by B label count(distinct D) 'Deliveries' count(distinct E) 'Items' sum(G) 'Units' count(distinct A) 'Warehouses' min(C) 'First' max(C) 'Latest'", 1)`,
    ],
    ["", "", "", "", "", ""],
    ["Warehouse Performance", "", "", "", "", ""],
    [
      `=QUERY(${calc}!A:J, "select A, sum(G), count(distinct E), count(distinct D), count(distinct B) where A is not null group by A label sum(G) 'Units' count(distinct E) 'Items' count(distinct D) 'Deliveries' count(distinct B) 'Suppliers'", 1)`,
    ],
  ];
}

async function ensureSheet(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  title: string,
  existing: Map<string, number>
): Promise<number> {
  const found = existing.get(title);
  if (found != null) return found;
  const res = await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: { requests: [{ addSheet: { properties: { title } } }] },
  });
  const id = res.data.replies?.[0]?.addSheet?.properties?.sheetId;
  if (id == null) throw new Error(`Gagal membuat tab: ${title}`);
  existing.set(title, id);
  return id;
}

async function renameSheet1IfNeeded(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  sheetList: sheets_v4.Schema$Sheet[]
): Promise<void> {
  const hasDc = sheetList.some((s) => s.properties?.title === DATA_COMPILATION_TAB_NAME);
  if (hasDc) return;
  const sheet1 = sheetList.find((s) => s.properties?.title === "Sheet1");
  if (!sheet1?.properties?.sheetId) return;
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [
        {
          updateSheetProperties: {
            properties: { sheetId: sheet1.properties.sheetId, title: DATA_COMPILATION_TAB_NAME },
            fields: "title",
          },
        },
      ],
    },
  });
}

/** Tab gudang, _DataCalc, dan Summary — referensi otomatis ke Data Compilation. */
export async function ensureInboundMonitoringWorkbook(
  config: GoogleExportConfig,
  sheets: sheets_v4.Sheets
): Promise<void> {
  const spreadsheetId = config.sheetId;
  const meta = await sheets.spreadsheets.get({
    spreadsheetId,
    fields: "sheets.properties(sheetId,title)",
  });
  const sheetList = meta.data.sheets ?? [];
  await renameSheet1IfNeeded(sheets, spreadsheetId, sheetList);

  const meta2 = await sheets.spreadsheets.get({
    spreadsheetId,
    fields: "sheets.properties(sheetId,title,index)",
  });
  const byTitle = new Map<string, number>();
  for (const s of meta2.data.sheets ?? []) {
    if (s.properties?.title && s.properties.sheetId != null) {
      byTitle.set(s.properties.title, s.properties.sheetId);
    }
  }

  await ensureSheet(sheets, spreadsheetId, DATA_CALC_TAB_NAME, byTitle);
  await ensureSheet(sheets, spreadsheetId, SUMMARY_TAB_NAME, byTitle);
  for (const g of SUPPLIER_GUDANG_OPTIONS) {
    await ensureSheet(sheets, spreadsheetId, g, byTitle);
  }

  for (const g of SUPPLIER_GUDANG_OPTIONS) {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `'${g.replace(/'/g, "''")}'!A1`,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [[gudangQueryFormula(g)]] },
    });
  }

  const calcHeaders = [
    "Gudang",
    "Supplier",
    "Tanggal SJ",
    "No. Surat Jalan",
    "Product Name",
    "SKU / Product Code",
    "Qty",
    "UOM",
    "Week",
    "YearWeek",
  ];
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `'${DATA_CALC_TAB_NAME}'!A1:J2`,
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [calcHeaders, [dataCalcArrayFormula()]],
    },
  });

  const summaryValues = summaryFilterAndKpiRows();
  await sheets.spreadsheets.values.clear({
    spreadsheetId,
    range: `'${SUMMARY_TAB_NAME}'!A:Z`,
  });
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `'${SUMMARY_TAB_NAME}'!A1`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: summaryValues },
  });

  const summaryId = byTitle.get(SUMMARY_TAB_NAME);
  if (summaryId != null) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [
          {
            updateSheetProperties: {
              properties: { sheetId: summaryId, gridProperties: { frozenRowCount: 1 } },
              fields: "gridProperties.frozenRowCount",
            },
          },
          {
            repeatCell: {
              range: {
                sheetId: summaryId,
                startRowIndex: 0,
                endRowIndex: 1,
                startColumnIndex: 0,
                endColumnIndex: 6,
              },
              cell: {
                userEnteredFormat: {
                  backgroundColor: { red: 0.12, green: 0.23, blue: 0.54 },
                  textFormat: { foregroundColor: { red: 1, green: 1, blue: 1 }, bold: true, fontSize: 12 },
                },
              },
              fields: "userEnteredFormat(backgroundColor,textFormat)",
            },
          },
          {
            repeatCell: {
              range: {
                sheetId: summaryId,
                startRowIndex: 10,
                endRowIndex: 11,
                startColumnIndex: 0,
                endColumnIndex: 2,
              },
              cell: {
                userEnteredFormat: {
                  backgroundColor: { red: 0.9, green: 0.93, blue: 0.98 },
                  textFormat: { bold: true },
                },
              },
              fields: "userEnteredFormat(backgroundColor,textFormat)",
            },
          },
        ],
      },
    });
  }

  const dcId = byTitle.get(DATA_COMPILATION_TAB_NAME) ?? byTitle.get("Sheet1");
  if (dcId != null) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [
          {
            updateSheetProperties: {
              properties: { sheetId: dcId, index: 0 },
              fields: "index",
            },
          },
        ],
      },
    });
  }
}

export function dataCompilationTabName(): string {
  return DATA_COMPILATION_TAB_NAME;
}

export { OCR_SHEET_HEADERS };
