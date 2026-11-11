export const OCR_REVIEW_STATUS = [
  "BELUM_DITINJAU",
  "SUDAH_DITINJAU",
  "TERVERIFIKASI_DISETUJUI",
  "MEMERLUKAN_REVISI",
  "MENUNGGU_REVISI_SUPPLIER",
  "TIDAK_SESUAI_KONFIRMASI",
  "SELESAI",
] as const;

/** Status untuk kartu dashboard & filter OCR Review (6 bucket). */
export const OCR_REVIEW_DASHBOARD_BUCKETS = [
  "BELUM_DITINJAU",
  "SUDAH_DITINJAU",
  "TERVERIFIKASI_DISETUJUI",
  "MEMERLUKAN_REVISI",
  "MENUNGGU_REVISI_SUPPLIER",
  "SELESAI",
] as const;

export type OcrReviewDashboardBucket = (typeof OCR_REVIEW_DASHBOARD_BUCKETS)[number];

export type OcrReviewStatus = (typeof OCR_REVIEW_STATUS)[number];

export const DEFAULT_OCR_REVIEW_STATUS: OcrReviewStatus = "BELUM_DITINJAU";

const LABELS: Record<OcrReviewStatus, string> = {
  BELUM_DITINJAU: "Belum Ditinjau",
  SUDAH_DITINJAU: "Sudah Ditinjau",
  TERVERIFIKASI_DISETUJUI: "Terverifikasi & Disetujui",
  MEMERLUKAN_REVISI: "Memerlukan Revisi",
  MENUNGGU_REVISI_SUPPLIER: "Menunggu Revisi Supplier",
  TIDAK_SESUAI_KONFIRMASI: "Menunggu Revisi Supplier",
  SELESAI: "Selesai",
};

export type ReviewStatusTone = "neutral" | "info" | "success" | "warning" | "danger";

const TONES: Record<OcrReviewStatus, ReviewStatusTone> = {
  BELUM_DITINJAU: "neutral",
  SUDAH_DITINJAU: "info",
  TERVERIFIKASI_DISETUJUI: "success",
  MEMERLUKAN_REVISI: "danger",
  MENUNGGU_REVISI_SUPPLIER: "warning",
  TIDAK_SESUAI_KONFIRMASI: "warning",
  SELESAI: "success",
};

const STATUS_ALIASES: Record<string, OcrReviewStatus> = {
  TIDAK_SESUAI: "MENUNGGU_REVISI_SUPPLIER",
  TIDAK_SESUAI_KONFIRMASI: "MENUNGGU_REVISI_SUPPLIER",
  MENUNGGU_REVISI: "MENUNGGU_REVISI_SUPPLIER",
  MEMERLUKAN_KONFIRMASI: "MENUNGGU_REVISI_SUPPLIER",
};

export function normalizeOcrReviewStatus(raw: string | undefined | null): OcrReviewStatus {
  const key = String(raw ?? "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "_");
  if (STATUS_ALIASES[key]) return STATUS_ALIASES[key];
  if (OCR_REVIEW_STATUS.includes(key as OcrReviewStatus)) {
    return key as OcrReviewStatus;
  }
  if (!key) return DEFAULT_OCR_REVIEW_STATUS;
  return DEFAULT_OCR_REVIEW_STATUS;
}

export function ocrReviewStatusLabel(status: OcrReviewStatus): string {
  return LABELS[normalizeOcrReviewStatus(status)];
}

export function ocrReviewDashboardBucketLabel(bucket: OcrReviewDashboardBucket): string {
  return LABELS[bucket];
}

export function ocrReviewDashboardBucketTone(bucket: OcrReviewDashboardBucket): ReviewStatusTone {
  return TONES[bucket];
}

export function ocrReviewStatusTone(status: OcrReviewStatus): ReviewStatusTone {
  return TONES[status];
}

/** Prioritas untuk agregasi banyak baris (ambil yang “paling maju”). */
const RANK: Record<OcrReviewStatus, number> = {
  BELUM_DITINJAU: 0,
  SUDAH_DITINJAU: 1,
  MEMERLUKAN_REVISI: 2,
  MENUNGGU_REVISI_SUPPLIER: 3,
  TIDAK_SESUAI_KONFIRMASI: 3,
  TERVERIFIKASI_DISETUJUI: 4,
  SELESAI: 5,
};

export function pickDominantReviewStatus(statuses: Iterable<OcrReviewStatus>): OcrReviewStatus {
  let best: OcrReviewStatus = DEFAULT_OCR_REVIEW_STATUS;
  let score = -1;
  for (const s of statuses) {
    const r = RANK[s] ?? 0;
    if (r > score) {
      score = r;
      best = s;
    }
  }
  return best;
}
