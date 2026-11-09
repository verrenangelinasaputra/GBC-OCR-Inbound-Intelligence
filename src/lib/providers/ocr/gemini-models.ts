let cachedModels: string[] | null = null;
let cacheKey: string | null = null;

/** Lite dulu untuk latency OCR (target ~1 menit per gambar pada foto standar). */
const PREFERRED_ORDER = [
  "gemini-2.5-flash-lite",
  "gemini-3.5-flash-lite",
  "gemini-2.5-flash",
  "gemini-3.5-flash",
  "gemini-3-flash-preview",
  "gemini-flash-latest",
];

const FAST_LITE_MODELS = ["gemini-2.5-flash-lite", "gemini-3.5-flash-lite"] as const;

function ocrFastModelsEnabled(): boolean {
  return process.env.GEMINI_OCR_FAST !== "false";
}

/** Urutan model efektif — mode cepat selalu coba flash-lite dulu (abaikan urutan lambat di env). */
export function getModelsFromEnv(): string[] {
  const fromEnv = process.env.GEMINI_MODEL?.trim();
  const envList = fromEnv
    ? fromEnv.split(",").map((m) => m.trim()).filter(Boolean)
    : [...PREFERRED_ORDER];

  if (!ocrFastModelsEnabled()) return envList;

  const merged: string[] = [];
  for (const lite of FAST_LITE_MODELS) {
    if (!merged.includes(lite)) merged.push(lite);
  }
  for (const m of envList) {
    if (!merged.includes(m)) merged.push(m);
  }
  return merged.slice(0, 2);
}

export async function resolveGeminiModels(apiKey: string): Promise<string[]> {
  if (cachedModels && cacheKey === apiKey) {
    return cachedModels;
  }

  const envModels = getModelsFromEnv();

  if (process.env.GEMINI_MODEL?.trim()) {
    cachedModels = envModels;
    cacheKey = apiKey;
    return envModels;
  }

  let available: string[] = [];

  try {
    const res = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models?pageSize=100",
      {
        headers: { "x-goog-api-key": apiKey },
        signal: AbortSignal.timeout(8_000),
      }
    );
    if (res.ok) {
      const json = (await res.json()) as {
        models?: Array<{ name: string; supportedGenerationMethods?: string[] }>;
      };
      available = (json.models ?? [])
        .filter((m) => m.supportedGenerationMethods?.includes("generateContent"))
        .map((m) => m.name.replace(/^models\//, ""));
    }
  } catch {
    /* fallback env only */
  }

  if (available.length === 0) {
    cachedModels = envModels;
    cacheKey = apiKey;
    return envModels;
  }

  const availableSet = new Set(available);
  const ordered: string[] = [];

  for (const m of envModels) {
    if (availableSet.has(m) && !ordered.includes(m)) ordered.push(m);
  }
  for (const m of PREFERRED_ORDER) {
    if (availableSet.has(m) && !ordered.includes(m)) ordered.push(m);
  }
  for (const m of available) {
    if (/flash/i.test(m) && !/tts|image|omni|lite-image/i.test(m) && !ordered.includes(m)) {
      ordered.push(m);
    }
  }

  cachedModels = ordered.slice(0, 8);
  cacheKey = apiKey;
  return cachedModels;
}
