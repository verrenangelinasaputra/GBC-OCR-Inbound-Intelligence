import { readFileSync } from "fs";
import { resolve } from "path";
import { GeminiOCRProvider } from "../src/lib/providers/ocr/gemini-ocr";

// Load .env manually
for (const line of readFileSync(resolve(process.cwd(), ".env"), "utf8").split("\n")) {
  const m = line.match(/^([A-Z_]+)="(.*)"$/);
  if (m) process.env[m[1]] = m[2];
}

async function main() {
  const img = resolve(process.cwd(), "storage/uploads/ca5bdebe-6e81-46bc-881e-ca1c210025c4.jpeg");
  const buf = readFileSync(img);
  const provider = new GeminiOCRProvider();
  const result = await provider.processImage(buf, "image/jpeg");
  console.log("Provider:", result.providerKey);
  console.log("No SJ:", result.suratJalanNumber);
  console.log("Lines:", result.lineItems.length);
  console.log("First item:", result.lineItems[0]?.supplierProductName);
}

main().catch((e) => {
  console.error("FAIL:", e.message);
  process.exit(1);
});
