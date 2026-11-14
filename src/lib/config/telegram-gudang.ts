import { SUPPLIER_GUDANG_OPTIONS } from "@/lib/config/supplier-gudang";

function parseGudangChatIdMap(): Map<string, string> {
  const map = new Map<string, string>();
  const rawJson = process.env.TELEGRAM_GUDANG_CHAT_IDS?.trim();
  if (rawJson) {
    try {
      const parsed = JSON.parse(rawJson) as Record<string, string | number>;
      for (const [key, value] of Object.entries(parsed)) {
        const gudang = key.trim();
        const chatId = String(value).trim();
        if (gudang && chatId) map.set(gudang, chatId);
      }
    } catch {
      console.warn("[telegram] TELEGRAM_GUDANG_CHAT_IDS bukan JSON valid");
    }
  }

  for (const gudang of SUPPLIER_GUDANG_OPTIONS) {
    const envKey = `TELEGRAM_CHAT_${gudang.replace(/\s+/g, "_").toUpperCase()}`;
    const fromEnv = process.env[envKey]?.trim();
    if (fromEnv) map.set(gudang, fromEnv);
  }

  return map;
}

let cachedMap: Map<string, string> | null = null;

export function resetTelegramGudangChatIdCache(): void {
  cachedMap = null;
}

export function getTelegramGudangChatIds(): Map<string, string> {
  if (!cachedMap) cachedMap = parseGudangChatIdMap();
  return cachedMap;
}

export function telegramUploadNotifyEnabled(): boolean {
  if (process.env.TELEGRAM_UPLOAD_NOTIFY?.trim().toLowerCase() === "false") return false;
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  if (!token) return false;
  return getTelegramGudangChatIds().size > 0;
}

export function resolveTelegramChatIdForGudang(gudang: string): string | null {
  const label = gudang.trim();
  if (!label) return null;
  const map = getTelegramGudangChatIds();
  if (map.has(label)) return map.get(label)!;
  const legacy = process.env.TELEGRAM_CHAT_ID?.trim();
  if (legacy && SUPPLIER_GUDANG_OPTIONS.includes(label as (typeof SUPPLIER_GUDANG_OPTIONS)[number])) {
    return legacy;
  }
  return null;
}

export function getAppBaseUrl(): string {
  const explicit =
    process.env.APP_BASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_APP_BASE_URL?.trim() ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "");
  if (explicit) return explicit.replace(/\/$/, "");
  return "https://gbc-sj.vercel.app";
}