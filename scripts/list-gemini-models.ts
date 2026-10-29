import { readFileSync } from "fs";
import { resolve } from "path";

function loadKey(): string {
  const envPath = resolve(process.cwd(), ".env");
  const text = readFileSync(envPath, "utf8");
  const m = text.match(/^GEMINI_API_KEY="([^"]+)"/m);
  if (!m?.[1]) throw new Error("GEMINI_API_KEY tidak ditemukan di .env");
  return m[1];
}

async function main() {
  const key = loadKey();
  const prefix = key.slice(0, 6);
  console.log("Key prefix:", prefix, "(jangan share full key)");

  const res = await fetch("https://generativelanguage.googleapis.com/v1beta/models?pageSize=100", {
    headers: { "x-goog-api-key": key },
  });
  console.log("ListModels HTTP", res.status);
  const body = await res.text();
  if (!res.ok) {
    console.log(body.slice(0, 800));
    return;
  }
  const json = JSON.parse(body) as {
    models?: Array<{ name: string; supportedGenerationMethods?: string[] }>;
  };
  const names = (json.models ?? [])
    .filter((m) => m.supportedGenerationMethods?.includes("generateContent"))
    .map((m) => m.name.replace(/^models\//, ""));
  console.log("Models with generateContent:", names.length);
  console.log(names.filter((n) => /flash/i.test(n)).slice(0, 20).join("\n"));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
