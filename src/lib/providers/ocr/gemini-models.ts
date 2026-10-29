let cachedModels: string[] | null = null;
let cacheKey: string | null = null;

const PREFERRED_ORDER = [
  "gemini-3.5-flash",
  "gemini-2.5-flash",
  "gemini-3-flash-preview",
  "gemini-flash-latest",
  "gemini-2.5-flash-lite",
  "gemini-3.5-flash-lite",
];

export function getModelsFromEnv(): string[] {
  const fromEnv = process.env.GEMINI_MODEL?.trim();
  if (fromEnv) {
    return fromEnv.split(",").map((m) => m.trim()).filter(Boolean);
  }
  return [...PREFERRED_ORDER];
}

export async function resolveGeminiModels(apiKey: string): Promise<string[]> {
  if (cachedModels && cacheKey === apiKey) {
    return cachedModels;
  }

  const envModels = getModelsFromEnv();
  let available: string[] = [];

  try {
    const res = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models?pageSize=100",
      { headers: { "x-goog-api-key": apiKey } }
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
