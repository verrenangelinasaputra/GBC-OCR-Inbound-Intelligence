export type TelegramSendResult = { ok: true } | { ok: false; error: string };

export function getTelegramBotToken(): string | null {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  return token || null;
}

export async function sendTelegramMessage(params: {
  chatId: string;
  text: string;
}): Promise<TelegramSendResult> {
  const token = getTelegramBotToken();
  if (!token) return { ok: false, error: "TELEGRAM_BOT_TOKEN kosong" };

  const chatId = params.chatId.trim();
  const text = params.text.trim();
  if (!chatId || !text) return { ok: false, error: "chatId atau teks kosong" };

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        disable_web_page_preview: false,
      }),
    });
    const data = (await res.json()) as { ok?: boolean; description?: string };
    if (!res.ok || !data.ok) {
      return { ok: false, error: data.description ?? `HTTP ${res.status}` };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "sendMessage gagal" };
  }
}

export async function getTelegramBotHealth(): Promise<{ status: string; message?: string }> {
  const token = getTelegramBotToken();
  if (!token) {
    return { status: "NOT_CONFIGURED", message: "TELEGRAM_BOT_TOKEN belum di-set" };
  }
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/getMe`, { method: "GET" });
    const data = (await res.json()) as {
      ok?: boolean;
      result?: { username?: string };
      description?: string;
    };
    if (!data.ok) {
      return { status: "ERROR", message: data.description ?? "getMe gagal" };
    }
    return {
      status: "CONNECTED",
      message: data.result?.username ? `@${data.result.username}` : "Bot aktif",
    };
  } catch (e) {
    return { status: "ERROR", message: e instanceof Error ? e.message : "getMe gagal" };
  }
}