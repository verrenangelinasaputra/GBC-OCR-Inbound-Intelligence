import type { sheets_v4 } from "googleapis";
import { DATA_COMPILATION_TAB_NAME } from "@/lib/config/ocr-export-target";
import { SUPPLIER_GUDANG_OPTIONS } from "@/lib/config/supplier-gudang";
import type { GoogleExportConfig } from "./config";
import { OCR_SHEET_HEADERS } from "./google-sj-export-rows";

export const SUMMARY_TAB_NAME = "Summary";
export const DATA_CALC_TAB_NAME = "_DataCalc";

/**
 * Pembuluh argument formula saat diketik di UI (locale Indonesia → `;`).
 * Untuk `values.update` + USER_ENTERED, gunakan locale spreadsheet (mis. in_ID → `;`).
 */
export function formulaArgSeparator(spreadsheetLocale?: string): string {
  const forced = process.env.GOOGLE_SHEET_FORMULA_LOCALE?.trim().toLowerCase();
  if (forced === "us" || forced === "en") return ",";
  if (forced === "id" || forced === "id_id") return ";";
  const loc = (spreadsheetLocale ?? "in_ID").toLowerCase();
  if (
    loc.startsWith("id_") ||
    loc.startsWith("in_id") ||
    loc.startsWith("de") ||
    loc.startsWith("fr") ||
    loc.startsWith("es")
  ) {
    return ";";
  }
  return ",";
}

function quoteTab(title: string): string {
  return `'${title.replace(/'/g, "''")}'`;
}

export function resolveDataCompilationTabTitle(titles: string[]): string {
  if (titles.includes(DATA_COMPILATION_TAB_NAME)) return DATA_COMPILATION_TAB_NAME;
  if (titles.includes("Sheet1")) return "Sheet1";
  return DATA_COMPILATION_TAB_NAME;
}

/** FILTER lebih andal daripada QUERY untuk locale Indonesia (pemisah `;`). */
function gudangFilterFormula(dcTab: string, gudang: string, sep: string): string {
  const safe = gudang.replace(/'/g, "''");
  const dc = quoteTab(dcTab);
  return `=FILTER(${dc}!$A$2:$S${sep} ${dc}!$A$2:$A="${safe}")`;
}

function dataCalcColumnFormulas(dcTab: string, sep: string): string[] {
  const dc = quoteTab(dcTab);
  const skip = `${sep}""${sep}`;
  const gate = `LEN(${dc}!$D$2:$D)=0`;
  const sjDate = `IFERROR(DATEVALUE(${dc}!$D$2:$D)${sep}"")`;
  return [
    `=ARRAYFORMULA(IF(${gate}${skip}${dc}!$A$2:$A))`,
    `=ARRAYFORMULA(IF(${gate}${skip}IF(LEN(${dc}!$B$2:$B)=0${sep}"Unverified"${sep}${dc}!$B$2:$B)))`,
    `=ARRAYFORMULA(IF(${gate}${skip}${sjDate}))`,
    `=ARRAYFORMULA(IF(${gate}${skip}${dc}!$E$2:$E))`,
    `=ARRAYFORMULA(IF(${gate}${skip}${dc}!$L$2:$L))`,
    `=ARRAYFORMULA(IF(${gate}${skip}"Unverified"))`,
    `=ARRAYFORMULA(IF(${gate}${skip}IFERROR(VALUE(REGEXEXTRACT(${dc}!$M$2:$M${sep}"^([\\d.,]+)"))${sep}0)))`,
    `=ARRAYFORMULA(IF(${gate}${skip}IFERROR(REGEXEXTRACT(${dc}!$M$2:$M${sep}"\\s(\\S+)$")${sep}"Pending")))`,
    `=ARRAYFORMULA(IF(${gate}${skip}WEEKNUM(IFERROR(DATEVALUE(${dc}!$D$2:$D)${sep}TODAY())${sep}2)))`,
    `=ARRAYFORMULA(IF(${gate}${skip}TEXT(IFERROR(DATEVALUE(${dc}!$D$2:$D)${sep}TODAY())${sep}"yyyy")&"-W"&TEXT(WEEKNUM(IFERROR(DATEVALUE(${dc}!$D$2:$D)${sep}TODAY())${sep}2)${sep}"00")))`,
  ];
}

/** Untuk unit test: pastikan formula tertutup dan memakai pemisah locale. */
export function dataCalcColumnFormulasForLocale(dcTab: string, locale?: string): string[] {
  return dataCalcColumnFormulas(dcTab, formulaArgSeparator(locale));
}

function summaryFilterAndKpiRows(sep: string, dcLabel: string): string[][] {
  const calc = quoteTab(DATA_CALC_TAB_NAME);
  const sum = quoteTab(SUMMARY_TAB_NAME);
  const filt = (extra: string) =>
    `(${calc}!C:C>=${sum}!$B$5)*(${calc}!C:C<=${sum}!$B$6)*(IF(${sum}!$B$7="ALL"${sep}1${sep}${calc}!A:A=${sum}!$B$7))*(IF(${sum}!$B$8="ALL"${sep}1${sep}${calc}!B:B=${sum}!$B$8))*(IF(LEN(${sum}!$B$9)=0${sep}1${sep}REGEXMATCH(${calc}!E:E${sep}"(?i)"&${sum}!$B$9)))${extra}`;

  const q = (query: string) => `=QUERY(${calc}!A:J${sep} "${query}"${sep} 1)`;

  return [
    ["GBC Inbound Goods Monitoring — Management Dashboard", "", "", "", "", ""],
    [`Sumber data: tab ${dcLabel} (tanpa input manual di Summary)`, "", "", "", "", ""],
    ["", "", "", "", "", ""],
    ["Filter", "Nilai", "", "", "", ""],
    [
      "Date From (Tanggal SJ)",
      `=DATE(YEAR(TODAY())${sep}MONTH(TODAY())${sep}1)`,
      "",
      "",
      "",
      "",
    ],
    ["Date To", "=TODAY()", "", "", "", ""],
    ["Warehouse", "ALL", "", "", "", ""],
    ["Supplier", "ALL", "", "", "", ""],
    ["Product contains", "", "", "", "", ""],
    ["", "", "", "", "", ""],
    ["KPI Overview", "Nilai", "", "", "", ""],
    [
      "Total Units Received",
      `=IFERROR(SUM(FILTER(${calc}!G:G${sep}${filt("")}))${sep}0)`,
      "",
      "",
      "",
      "",
    ],
    [
      "Total Unique Items",
      `=IFERROR(ROWS(UNIQUE(FILTER(${calc}!E:E${sep}${filt(`*(${calc}!E:E<>"")`)})))${sep}0)`,
      "",
      "",
      "",
      "",
    ],
    [
      "Total Deliveries (unique SJ)",
      `=IFERROR(ROWS(UNIQUE(FILTER(${calc}!D:D${sep}${filt(`*(${calc}!D:D<>"")`)})))${sep}0)`,
      "",
      "",
      "",
      "",
    ],
    [
      "Total Suppliers",
      `=IFERROR(ROWS(UNIQUE(FILTER(${calc}!B:B${sep}${filt(`*(${calc}!B:B<>"")`)})))${sep}0)`,
      "",
      "",
      "",
      "",
    ],
    [
      "Active Warehouses",
      `=IFERROR(ROWS(UNIQUE(FILTER(${calc}!A:A${sep}${filt(`*(${calc}!A:A<>"")`)})))${sep}0)`,
      "",
      "",
      "",
      "",
    ],
    [
      "Total Delivery Days",
      `=IFERROR(ROWS(UNIQUE(FILTER(${calc}!C:C${sep}${filt(`*(${calc}!C:C<>"")`)})))${sep}0)`,
      "",
      "",
      "",
      "",
    ],
    ["", "", "", "", "", ""],
    ["Weekly Inbound Overview", "", "", "", "", ""],
    [
      q(
        "select J, count(E), sum(G) where G > 0 group by J label count(E) 'Line Items' sum(G) 'Units'"
      ),
    ],
    ["", "", "", "", "", ""],
    ["Weekly Item Summary (by product & warehouse)", "", "", "", "", ""],
    [
      q(
        "select J, F, E, A, sum(G), H where E is not null group by J, F, E, A, H label sum(G) 'Total Qty'"
      ),
    ],
    ["", "", "", "", "", ""],
    ["Delivery Breakdown (detail)", "", "", "", "", ""],
    [q("select C, J, A, B, D, F, E, G, H where C is not null order by C desc")],
    ["", "", "", "", "", ""],
    ["Supplier Summary", "", "", "", "", ""],
    [
      q(
        "select B, count(D), count(E), sum(G), min(C), max(C) where B is not null group by B label count(D) 'Deliveries' count(E) 'Items' sum(G) 'Units' min(C) 'First' max(C) 'Latest'"
      ),
    ],
    ["", "", "", "", "", ""],
    ["Warehouse Performance", "", "", "", "", ""],
    [
      q(
        "select A, sum(G), count(E), count(D), count(B) where A is not null group by A label sum(G) 'Units' count(E) 'Items' count(D) 'Deliveries' count(B) 'Suppliers'"
      ),
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
    fields: "properties.locale,sheets.properties(sheetId,title)",
  });
  const locale = meta.data.properties?.locale ?? undefined;
  const sep = formulaArgSeparator(locale);
  if (process.env.DEBUG_SHEET_FORMULAS === "1") {
    console.log("[monitoring] locale=", locale, "sep=", JSON.stringify(sep));
  }
  const sheetList = meta.data.sheets ?? [];
  await renameSheet1IfNeeded(sheets, spreadsheetId, sheetList);

  const meta2 = await sheets.spreadsheets.get({
    spreadsheetId,
    fields: "sheets.properties(sheetId,title,index)",
  });
  const titles = (meta2.data.sheets ?? [])
    .map((s) => s.properties?.title)
    .filter(Boolean) as string[];
  const dcTab = resolveDataCompilationTabTitle(titles);

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
    const tabName = `'${g.replace(/'/g, "''")}'`;
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${tabName}!A1:S1`,
      valueInputOption: "RAW",
      requestBody: { values: [Array.from(OCR_SHEET_HEADERS)] },
    });
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${tabName}!A2`,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [[gudangFilterFormula(dcTab, g, sep)]] },
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
  const colFormulas = dataCalcColumnFormulas(dcTab, sep);
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `'${DATA_CALC_TAB_NAME}'!A1:J1`,
    valueInputOption: "RAW",
    requestBody: { values: [calcHeaders] },
  });
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `'${DATA_CALC_TAB_NAME}'!A2:J2`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [colFormulas] },
  });

  const summaryValues = summaryFilterAndKpiRows(sep, dcTab);
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
        ],
      },
    });
  }

  const dcId = byTitle.get(dcTab) ?? byTitle.get(DATA_COMPILATION_TAB_NAME) ?? byTitle.get("Sheet1");
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
