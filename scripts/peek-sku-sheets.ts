import { loadEnvFile } from "./load-env";
import { google } from "googleapis";

loadEnvFile();
import { getGoogleExportConfigOptional } from "@/lib/providers/google-workspace/config";
import { createGoogleAuthClient } from "@/lib/providers/google-workspace/client";

const config = getGoogleExportConfigOptional();
if (!config) throw new Error("no config");
const auth = createGoogleAuthClient(config);
const sheets = google.sheets({ version: "v4", auth });

async function peek(id: string, tab: string, endRow = 3) {
  const safe = `'${tab.replace(/'/g, "''")}'!1:${endRow}`;
  const res = await sheets.spreadsheets.values.get({ spreadsheetId: id, range: safe });
  console.log("---", tab, id);
  console.log(JSON.stringify(res.data.values, null, 2));
}

async function listTabs(id: string) {
  const meta = await sheets.spreadsheets.get({ spreadsheetId: id, fields: "sheets.properties.title" });
  console.log(
    "Tabs",
    id,
    meta.data.sheets?.map((s) => s.properties?.title)
  );
}

async function main() {
await listTabs("1QePx5At4B0SiDfeLU9s5N7vsz394Z7K1kElSPxxJmYE");
for (const tab of ["REKAP SKUL", "REKAP SKU", "Model SKU"]) {
  try {
    await peek("1QePx5At4B0SiDfeLU9s5N7vsz394Z7K1kElSPxxJmYE", tab, 4);
  } catch (e) {
    console.log("skip", tab, (e as Error).message);
  }
}

await listTabs("1QEXrV23W2xZnjrmaw8MJbJmfvprv5c4NoTZksTM91Tg");
for (const tab of ["Data Barang Masuk", "Sheet1"]) {
  try {
    await peek("1QEXrV23W2xZnjrmaw8MJbJmfvprv5c4NoTZksTM91Tg", tab, 4);
  } catch (e) {
    console.log("skip", tab, (e as Error).message);
  }
}
}

void main();
