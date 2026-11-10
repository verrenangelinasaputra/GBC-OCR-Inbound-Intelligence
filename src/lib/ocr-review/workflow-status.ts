export const OCR_REVIEW_STATUS = [
  "BELUM_DITINJAU",
  "SUDAH_DITINJAU",
  "TERVERIFIKASI_DISETUJUI",
  "TIDAK_SESUAI_KONFIRMASI",
  "SELESAI",
] as const;

export type OcrReviewStatus = (typeof OCR_REVIEW_STATUS)[number];

export const DEFAULT_OCR_REVIEW_STATUS: OcrReviewStatus = "BELUM_DITINJAU";

const LABELS: Record<OcrReviewStatus, string> = {
  BELUM_DITINJAU: "Belum Ditinjau",
  SUDAH_DITINJAU: "Sudah Ditinjau",
  TERVERIFIKASI_DISETUJUI: "Terverifikasi & Disetujui",
  TIDAK_SESUAI_KONFIRMASI: "Tidak Sesuai, memerlukan Konfirmasi",
  SELESAI: "Selesai",
};

export type ReviewStatusTone = "neutral" | "info" | "success" | "warning" | "danger";

const TONES: Record<OcrReviewStatus, ReviewStatusTone> = {
  BELUM_DITINJAU: "neutral",
  SUDAH_DITINJAU: "info",
  TERVERIFIKASI_DISETUJUI: "success",
  TIDAK_SESUAI_KONFIRMASI: "warning",
  SELESAI: "success",
};

export function normalizeOcrReviewStatus(raw: string | undefined | null): OcrReviewStatus {
  const key = String(raw ?? "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "_");
  if (OCR_REVIEW_STATUS.includes(key as OcrReviewStatus)) {
    return key as OcrReviewStatus;
  }
  if (!key) return DEFAULT_OCR_REVIEW_STATUS;
  return DEFAULT_OCR_REVIEW_STATUS;
}

export function ocrReviewStatusLabel(status: OcrReviewStatus): string {
  return LABELS[status];
}

export function ocrReviewStatusTone(status: OcrReviewStatus): ReviewStatusTone {
  return TONES[status];
}

/** Prioritas untuk agregasi banyak baris (ambil yang “paling maju”). */
const RANK: Record<OcrReviewStatus, number> = {
  BELUM_DITINJAU: 0,
  SUDAH_DITINJAU: 1,
  TIDAK_SESUAI_KONFIRMASI: 2,
  TERVERIFIKASI_DISETUJUI: 3,
  SELESAI: 4,
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
