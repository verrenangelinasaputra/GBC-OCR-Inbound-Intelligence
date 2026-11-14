import {
  resolveTelegramChatIdForGudang,
  telegramUploadNotifyEnabled,
} from "@/lib/config/telegram-gudang";
import { sendTelegramMessage } from "@/lib/providers/notifications/telegram-api";
import type { SheetOnlyUploadResult } from "@/lib/services/sheet-only-upload";
import { buildTelegramUploadMessageText } from "@/lib/services/telegram-upload-message";

export type SupplierUploadTelegramParams = {
  gudang: string;
  supplierName: string;
  result: SheetOnlyUploadResult;
  barangLines?: string[];
};

/** Notifikasi Telegram ke grup/channel gudang — tidak melempar error ke caller. */
export async function notifySupplierUploadTelegram(params: SupplierUploadTelegramParams): Promise<void> {
  if (!telegramUploadNotifyEnabled()) return;

  const chatId = resolveTelegramChatIdForGudang(params.gudang);
  if (!chatId) {
    console.warn("[telegram] Tidak ada chat_id untuk gudang:", params.gudang);
    return;
  }

  const text = buildTelegramUploadMessageText(params);
  const sent = await sendTelegramMessage({ chatId, text });
  if (!sent.ok) {
    console.error("[telegram] Gagal kirim notif upload:", sent.error, {
      gudang: params.gudang,
      chatId,
    });
    return;
  }
  console.info("[telegram] Notif upload terkirim:", params.gudang, chatId);
}