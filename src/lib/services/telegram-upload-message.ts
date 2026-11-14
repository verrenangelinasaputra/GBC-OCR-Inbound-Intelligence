import {
  resolveItemProductName,
  type GeminiSJItem,
  type GeminiSJPayload,
} from "@/lib/providers/ocr/gemini-surat-jalan";
import type { SheetOnlyUploadResult } from "@/lib/services/sheet-only-upload";

export function formatTelegramBarangLines(payload: GeminiSJPayload, maxItems = 30): string[] {
  const items = (payload.items ?? []).filter((i) => !i.is_subtotal && String(i.nama_barang ?? "").trim());
  if (!items.length) return [];

  const lines: string[] = [];
  const shown = items.slice(0, maxItems);
  shown.forEach((item, idx) => {
    lines.push(formatSingleBarangLine(idx + 1, item));
  });
  if (items.length > maxItems) {
    lines.push(`… +${items.length - maxItems} baris lainnya (lihat sheet/Drive)`);
  }
  return lines;
}

function formatSingleBarangLine(index: number, item: GeminiSJItem): string {
  const name = resolveItemProductName(item).trim().toUpperCase() || "—";
  const jumlah = formatJumlah(item);
  let line = `${index}. ${name}`;
  if (jumlah) line += ` — ${jumlah}`;
  const ket = String(item.keterangan ?? "").trim();
  if (ket) {
    const short = ket.length > 60 ? `${ket.slice(0, 57)}…` : ket;
    line += ` (${short})`;
  }
  if (item.ragu) line += " [CEK OCR]";
  return line;
}

function formatJumlah(item: GeminiSJItem): string {
  if (item.jumlah_qty != null) {
    const sat = (item.jumlah_satuan || "PCS").trim();
    return `${item.jumlah_qty} ${sat}`;
  }
  if (item.banyaknya_qty != null && item.isi_qty != null) {
    const calc = item.banyaknya_qty * item.isi_qty;
    const sat = (item.jumlah_satuan || "PCS").trim();
    return `≈ ${calc} ${sat}`;
  }
  return "";
}

export type TelegramUploadMessageParams = {
  gudang: string;
  supplierName: string;
  result: SheetOnlyUploadResult;
  barangLines?: string[];
};

const TELEGRAM_TEXT_MAX = 4000;

export function buildTelegramUploadMessageText(params: TelegramUploadMessageParams): string {
  const { gudang, supplierName, result, barangLines } = params;
  const noSj = result.suratJalanNumber?.trim() || "— belum terbaca OCR —";

  const lines = [
    "📦 Surat Jalan baru (upload supplier)",
    "",
    `Gudang: ${gudang}`,
    `Supplier: ${supplierName || "—"}`,
    `No. SJ: ${noSj}`,
    `Ref: ${result.submissionRef}`,
  ];

  if (result.driveFileUrl) {
    lines.push("", `Foto Drive: ${result.driveFileUrl}`);
  } else if (result.driveWarning) {
    lines.push("", `Foto Drive: ⚠ ${result.driveWarning.slice(0, 160)}`);
  }

  lines.push("");
  if (barangLines?.length) {
    lines.push("Barang:");
    lines.push(...barangLines);
  } else {
    lines.push("Barang: — tidak terdeteksi OCR —");
  }

  let text = lines.join("\n");
  if (text.length > TELEGRAM_TEXT_MAX) {
    text = `${text.slice(0, TELEGRAM_TEXT_MAX - 20)}\n…(dipotong)`;
  }
  return text;
}