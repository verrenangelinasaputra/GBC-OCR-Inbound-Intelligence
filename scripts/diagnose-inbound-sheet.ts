import { google } from "googleapis";
import { loadEnvFile } from "./load-env";
import { createGoogleAuthClient } from "../src/lib/providers/google-workspace/client";
import { getGoogleExportConfigOptional } from "../src/lib/providers/google-workspace";
import { DATA_COMPILATION_TAB_NAME } from "../src/lib/config/ocr-export-target";
import { SUMMARY_BAND_LAYOUT } from "../src/lib/providers/google-workspace/inbound-monitoring-layout";

function colLetter(index0: number): string {
  let n = index0;
  let s = "";
  while (n >= 0) {
    s = String.fromCharCode(65 + (n % 26)) + s;
    n = Math.floor(n / 26) - 1;
  }
  return s;
}
import { SUPPLIER_GUDANG_OPTIONS } from "../src/lib/config/supplier-gudang";

loadEnvFile();

async function readCell(
  sheets: ReturnType<typeof google.sheets>,
  spreadsheetId: string,
  range: string,
  formula = false
) {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range,
    valueRenderOption: formula ? "FORMULA" : "UNFORMATTED_VALUE",
  });
  return res.data.values?.[0]?.[0] ?? "";
}

async function main() {
  const cfg = getGoogleExportConfigOptional();
  if (!cfg) {
    console.error("Google export tidak dikonfigurasi");
    process.exit(1);
  }
  const auth = createGoogleAuthClient(cfg);
  const sheets = google.sheets({ version: "v4", auth });
  const id = cfg.sheetId;

  const meta = await sheets.spreadsheets.get({
    spreadsheetId: id,
    fields: "properties.locale,sheets.properties(title)",
  });
  console.log("Locale:", meta.data.properties?.locale);
  console.log("Tabs:", meta.data.sheets?.map((s) => s.properties?.title).join(" | "));

  const dc =
    meta.data.sheets?.some((s) => s.properties?.title === DATA_COMPILATION_TAB_NAME)
      ? DATA_COMPILATION_TAB_NAME
      : "Sheet1";

  console.log("\nData tab efektif:", dc);
  console.log("Header A1:", await readCell(sheets, id, `'${dc}'!A1`));
  console.log("Header B1:", await readCell(sheets, id, `'${dc}'!B1`));

  for (const g of SUPPLIER_GUDANG_OPTIONS.slice(0, 2)) {
    const a1 = await readCell(sheets, id, `'${g}'!A1`);
    const a2 = await readCell(sheets, id, `'${g}'!A2`);
    const f2 = await readCell(sheets, id, `'${g}'!A2`, true);
    console.log(`\n[${g}] A1 header:`, String(a1).slice(0, 80));
    console.log(`[${g}] A2 value:`, String(a2).slice(0, 80));
    console.log(`[${g}] A2 formula:`, String(f2).slice(0, 200));
  }

  for (const col of ["A2", "C2", "G2"]) {
    const v = await readCell(sheets, id, `'_DataCalc'!${col}`);
    const f = await readCell(sheets, id, `'_DataCalc'!${col}`, true);
    console.log(`_DataCalc ${col} value:`, String(v).slice(0, 80));
    console.log(`_DataCalc ${col} formula:`, String(f).slice(0, 200));
  }

  const B = SUMMARY_BAND_LAYOUT;
  const q = B.queryRow;
  for (const addr of [
    "B5",
    "B12",
    `${colLetter(B.bandColIndex.weekly)}${q}`,
    `${colLetter(B.bandColIndex.item)}${q}`,
    `${colLetter(B.bandColIndex.delivery)}${q}`,
    `${colLetter(B.bandColIndex.supplier)}${q}`,
    `${colLetter(B.bandColIndex.warehouse)}${q}`,
  ]) {
    const v = await readCell(sheets, id, `'Summary'!${addr}`);
    const err = String(v).includes("#");
    console.log(`Summary ${addr}:`, String(v).slice(0, 100), err ? "⚠" : "ok");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
