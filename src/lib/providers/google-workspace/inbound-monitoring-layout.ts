import type { sheets_v4 } from "googleapis";
import { DATA_COMPILATION_TAB_NAME } from "@/lib/config/ocr-export-target";
import { SUPPLIER_GUDANG_OPTIONS } from "@/lib/config/supplier-gudang";
import type { GoogleExportConfig } from "./config";
import { OCR_SHEET_HEADERS } from "./google-sj-export-rows";
import { applyOcrSheetFormatting } from "./ocr-sheet-format";
import { applySummaryDashboardFormatting } from "./summary-sheet-format";

export const SUMMARY_TAB_NAME = "Summary";
export const DATA_CALC_TAB_NAME = "_DataCalc";

/**
 * Tabel QUERY di baris sama, kolom berbeda — spill vertikal tanpa tabrakan (#REF!),
 * tanpa jarak baris kosong besar (Google Sheets tidak bisa "insert row" otomatis).
 */
export const SUMMARY_BAND_LAYOUT = {
  headerRow: 19,
  queryRow: 20,
  wideColumns: 32,
  /** Indeks kolom 0-based pada baris QUERY (A=0, F=5, M=12, V=21, AB=27). */
  bandColIndex: {
    weekly: 0,
    item: 5,
    delivery: 12,
    supplier: 21,
    warehouse: 27,
  },
} as const;

function wideSummaryRow(fill = ""): string[] {
  return Array(SUMMARY_BAND_LAYOUT.wideColumns).fill(fill);
}

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
  const calcRange = `${calc}!A2:J`;
  const filt = (extra: string) =>
    `(${calc}!C2:C>=${sum}!$B$5)*(${calc}!C2:C<=${sum}!$B$6)*(IF(${sum}!$B$7="ALL"${sep}1${sep}${calc}!A2:A=${sum}!$B$7))*(IF(${sum}!$B$8="ALL"${sep}1${sep}${calc}!B2:B=${sum}!$B$8))*(IF(LEN(${sum}!$B$9)=0${sep}1${sep}REGEXMATCH(${calc}!E2:E${sep}"(?i)"&${sum}!$B$9)))${extra}`;

  const q = (query: string) => `=QUERY(${calcRange}${sep} "${query}"${sep} 0)`;
  const band = SUMMARY_BAND_LAYOUT.bandColIndex;

  const rows: string[][] = [
    ["GBC Inbound Goods Monitoring — Management Dashboard", "", "", "", "", ""],
    [`Sumber data: tab ${dcLabel} (tanpa input manual di Summary)`, "", "", "", "", ""],
    ["", "", "", "", "", ""],
    ["Filter", "Nilai", "", "", "", ""],
    [
      "Date From (Tanggal SJ)",
      `=DATE(YEAR(TODAY())${sep}1${sep}1)`,
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
      `=IFERROR(SUM(FILTER(${calc}!G2:G${sep}${filt("")}))${sep}0)`,
      "",
      "",
      "",
      "",
    ],
    [
      "Total Unique Items",
      `=IFERROR(ROWS(UNIQUE(FILTER(${calc}!E2:E${sep}${filt(`*(${calc}!E2:E<>"")`)})))${sep}0)`,
      "",
      "",
      "",
      "",
    ],
    [
      "Total Deliveries (unique SJ)",
      `=IFERROR(ROWS(UNIQUE(FILTER(${calc}!D2:D${sep}${filt(`*(${calc}!D2:D<>"")`)})))${sep}0)`,
      "",
      "",
      "",
      "",
    ],
    [
      "Total Suppliers",
      `=IFERROR(ROWS(UNIQUE(FILTER(${calc}!B2:B${sep}${filt(`*(${calc}!B2:B<>"")`)})))${sep}0)`,
      "",
      "",
      "",
      "",
    ],
    [
      "Active Warehouses",
      `=IFERROR(ROWS(UNIQUE(FILTER(${calc}!A2:A${sep}${filt(`*(${calc}!A2:A<>"")`)})))${sep}0)`,
      "",
      "",
      "",
      "",
    ],
    [
      "Total Delivery Days",
      `=IFERROR(ROWS(UNIQUE(FILTER(${calc}!C2:C${sep}${filt(`*(${calc}!C2:C<>"")`)})))${sep}0)`,
      "",
      "",
      "",
      "",
    ],
    ["", "", "", "", "", ""],
  ];

  const headerRow = wideSummaryRow();
  headerRow[band.weekly] = "Weekly Inbound Overview";
  headerRow[band.item] = "Weekly Item Summary (by product & warehouse)";
  headerRow[band.delivery] = "Delivery Breakdown (detail)";
  headerRow[band.supplier] = "Supplier Summary";
  headerRow[band.warehouse] = "Warehouse Performance";
  rows.push(headerRow);

  const queryRow = wideSummaryRow();
  queryRow[band.weekly] = q("select J, sum(G) where G > 0 and J is not null group by J");
  queryRow[band.item] = q(
    "select J, F, E, A, sum(G), H where E is not null and G > 0 group by J, F, E, A, H"
  );
  queryRow[band.delivery] = q(
    "select C, J, A, B, D, F, E, G, H where C is not null and G > 0 order by C desc"
  );
  queryRow[band.supplier] = q("select B, sum(G) where B is not null and G > 0 group by B");
  queryRow[band.warehouse] = q("select A, sum(G) where A is not null and G > 0 group by A");
  rows.push(queryRow);

  return rows;
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
    const gudangSheetId = byTitle.get(g);
    if (gudangSheetId != null) {
      await applyOcrSheetFormatting(sheets, spreadsheetId, gudangSheetId);
    }
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
    range: `'${SUMMARY_TAB_NAME}'!A1:AF30`,
  });
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `'${SUMMARY_TAB_NAME}'!A1`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: summaryValues },
  });

  const summaryId = byTitle.get(SUMMARY_TAB_NAME);
  if (summaryId != null) {
    await applySummaryDashboardFormatting(sheets, spreadsheetId, summaryId);
  }

  const dcId = byTitle.get(dcTab) ?? byTitle.get(DATA_COMPILATION_TAB_NAME) ?? byTitle.get("Sheet1");
  if (dcId != null) {
    await applyOcrSheetFormatting(sheets, spreadsheetId, dcId);
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
