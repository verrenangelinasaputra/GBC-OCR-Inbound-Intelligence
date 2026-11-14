import {
  getAppBaseUrl,
  resolveTelegramChatIdForGudang,
  telegramUploadNotifyEnabled,
} from "@/lib/config/telegram-gudang";
import { sendTelegramMessage } from "@/lib/providers/notifications/telegram-api";
import type { SheetOnlyUploadResult } from "@/lib/services/sheet-only-upload";

export type SupplierUploadTelegramParams = {
  gudang: string;
  supplierName: string;
  fileName: string;
  result: SheetOnlyUploadResult;
};

function formatUploadTelegramText(params: SupplierUploadTelegramParams): string {
  const { gudang, supplierName, fileName, result } = params;
  const noSj = result.suratJalanNumber?.trim() || "— belum terbaca OCR —";
  const base = getAppBaseUrl();
  const lines = [
    "📦 Surat Jalan baru (upload supplier)",
    "",
    `Gudang: ${gudang}`,
    `Supplier: ${supplierName || "—"}`,
    `No. SJ: ${noSj}`,
    `File: ${fileName}`,
    `Baris sheet: ${result.sheetRowCount}`,
    `Ref: ${result.submissionRef}`,
  ];
  if (result.sheetUrl) {
    lines.push("", `Spreadsheet: ${result.sheetUrl}`);
  }
  if (result.driveFileUrl) {
    lines.push(`Foto Drive: ${result.driveFileUrl}`);
  } else if (result.driveWarning) {
    lines.push(`Drive: ⚠ ${result.driveWarning.slice(0, 200)}`);
  }
  lines.push("", `Review: ${base}/ocr-review`);
  return lines.join("\n");
}

/** Notifikasi Telegram ke grup/channel gudang — tidak melempar error ke caller. */
export async function notifySupplierUploadTelegram(params: SupplierUploadTelegramParams): Promise<void> {
  if (!telegramUploadNotifyEnabled()) return;

  const chatId = resolveTelegramChatIdForGudang(params.gudang);
  if (!chatId) {
    console.warn("[telegram] Tidak ada chat_id untuk gudang:", params.gudang);
    return;
  }

  const text = formatUploadTelegramText(params);
  const sent = await sendTelegramMessage({ chatId, text });
  if (!sent.ok) {
    console.error("[telegram] Gagal kirim notif upload:", sent.error, { gudang: params.gudang });
  }
}