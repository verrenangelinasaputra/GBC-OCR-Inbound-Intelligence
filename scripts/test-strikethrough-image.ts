import { readFileSync } from "fs";
import { resolve } from "path";
import { GeminiOCRProvider } from "../src/lib/providers/ocr/gemini-ocr";

for (const line of readFileSync(resolve(process.cwd(), ".env"), "utf8").split("\n")) {
  const m = line.match(/^([A-Z_]+)="(.*)"$/);
  if (m) process.env[m[1]] = m[2];
}

const img = process.argv[2] ?? resolve(
  process.cwd(),
  "../.cursor/projects/d-Engku-Yanto-2-GBC-OCR-gbc-inbound-intelligence/assets/WhatsApp_Image_2026-10-17_at_6.43.53_PM-fcf5c89c-7fb8-4892-9d74-260542fa4ece.jpg"
);

async function main() {
  const buf = readFileSync(img);
  const provider = new GeminiOCRProvider();
  const result = await provider.processImage(buf, "image/jpeg");
  console.log("Provider:", result.providerKey);
  console.log("Lines:", result.lineItems.length);
  for (const l of result.lineItems) {
    console.log("-", l.supplierProductName, "|", l.extractionNotes?.slice(0, 120));
  }
}

main().catch((e) => {
  console.error("FAIL:", e.message);
  process.exit(1);
});
