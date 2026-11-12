import type { OcrReviewStatus } from "./workflow-status";
import { normalizeOcrReviewStatus } from "./workflow-status";

export type WorkflowStampFields = {
  tsKirimSupplier?: string;
  tsDitinjauGudang?: string;
  tsRevisiGudang?: string;
  tsApproveGudang?: string;
  tsKonfirmasiSupplier?: string;
  exportTimestamp?: string;
  statusReview?: OcrReviewStatus | string;
};

const ISO_TS = /^(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2}):(\d{2})$/;

/** Parse cap waktu sheet (`YYYY-MM-DD HH:mm:ss` WIB) atau tanggal ekspor `dd/mm/yyyy`. */
export function parseWorkflowInstant(raw: string | undefined | null): Date | null {
  const text = String(raw ?? "").trim();
  if (!text) return null;
  const iso = ISO_TS.exec(text);
  if (iso) {
    return new Date(
      Number(iso[1]),
      Number(iso[2]) - 1,
      Number(iso[3]),
      Number(iso[4]),
      Number(iso[5]),
      Number(iso[6])
    );
  }
  const slash = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(text);
  if (slash) {
    return new Date(Number(slash[3]), Number(slash[2]) - 1, Number(slash[1]), 0, 0, 0);
  }
  return null;
}

export function formatWorkflowShort(raw: string | undefined | null): string {
  const text = String(raw ?? "").trim();
  if (!text) return "—";
  const d = parseWorkflowInstant(text);
  if (!d) return text;
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(d);
}

export function formatDurationMs(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) return "—";
  const totalMinutes = Math.floor(ms / 60_000);
  if (totalMinutes < 60) return `${Math.max(1, totalMinutes)} menit`;
  const hours = Math.floor(totalMinutes / 60);
  if (hours < 48) return `${hours} jam`;
  const days = Math.floor(hours / 24);
  const remH = hours % 24;
  return remH > 0 ? `${days} h ${remH} j` : `${days} hari`;
}

/** Waktu sejak kirim supplier sampai ditinjau gudang (atau sampai sekarang jika belum ditinjau). */
export function warehouseReviewWaitMs(fields: WorkflowStampFields, now = new Date()): number | null {
  const start =
    parseWorkflowInstant(fields.tsKirimSupplier) ?? parseWorkflowInstant(fields.exportTimestamp);
  if (!start) return null;
  const reviewed = parseWorkflowInstant(fields.tsDitinjauGudang);
  const status = normalizeOcrReviewStatus(fields.statusReview);
  if (reviewed) return reviewed.getTime() - start.getTime();
  if (status === "BELUM_DITINJAU") return now.getTime() - start.getTime();
  return null;
}

/** Untuk sorting: nilai besar = menunggu lebih lama; sudah ditinjau = -1. */
export function warehouseReviewWaitSortKey(fields: WorkflowStampFields, now = new Date()): number {
  const status = normalizeOcrReviewStatus(fields.statusReview);
  const reviewed = parseWorkflowInstant(fields.tsDitinjauGudang);
  if (reviewed || status !== "BELUM_DITINJAU") return -1;
  const wait = warehouseReviewWaitMs(fields, now);
  return wait ?? -1;
}

export type WorkflowStep = { key: string; label: string; at: string | null; done: boolean };

export function buildWorkflowSteps(fields: WorkflowStampFields): WorkflowStep[] {
  return [
    { key: "kirim", label: "Kirim supplier", at: fields.tsKirimSupplier ?? null, done: Boolean(fields.tsKirimSupplier?.trim()) },
    {
      key: "tinjau",
      label: "Ditinjau gudang",
      at: fields.tsDitinjauGudang ?? null,
      done: Boolean(fields.tsDitinjauGudang?.trim()),
    },
    { key: "revisi", label: "Revisi gudang", at: fields.tsRevisiGudang ?? null, done: Boolean(fields.tsRevisiGudang?.trim()) },
    { key: "approve", label: "Approve gudang", at: fields.tsApproveGudang ?? null, done: Boolean(fields.tsApproveGudang?.trim()) },
    {
      key: "konfirm",
      label: "Konfirmasi supplier",
      at: fields.tsKonfirmasiSupplier ?? null,
      done: Boolean(fields.tsKonfirmasiSupplier?.trim()),
    },
  ];
}
