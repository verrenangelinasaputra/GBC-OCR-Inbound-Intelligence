import type { OcrSheetDocument } from "@/lib/services/ocr-sheet-list";
import {
  type OcrReviewDashboardBucket,
  normalizeOcrReviewStatus,
  OCR_REVIEW_DASHBOARD_BUCKETS,
} from "@/lib/ocr-review/workflow-status";

export function classifyOcrReviewDashboardBucket(doc: OcrSheetDocument): OcrReviewDashboardBucket {
  const normalized = normalizeOcrReviewStatus(doc.statusReview);
  if (normalized === "SELESAI") return "SELESAI";
  if (normalized === "TERVERIFIKASI_DISETUJUI") return "TERVERIFIKASI_DISETUJUI";
  if (normalized === "MENUNGGU_REVISI_SUPPLIER") return "MENUNGGU_REVISI_SUPPLIER";
  if (normalized === "MEMERLUKAN_REVISI") return "MEMERLUKAN_REVISI";
  if (normalized === "SUDAH_DITINJAU") {
    if (doc.lineStatus === "CEK") return "MEMERLUKAN_REVISI";
    return "SUDAH_DITINJAU";
  }
  return "BELUM_DITINJAU";
}

export function docMatchesDashboardBucket(doc: OcrSheetDocument, bucket: OcrReviewDashboardBucket): boolean {
  return classifyOcrReviewDashboardBucket(doc) === bucket;
}

export function parseDashboardBucketFilter(raw: string | undefined | null): OcrReviewDashboardBucket | null {
  const key = String(raw ?? "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "_");
  if (OCR_REVIEW_DASHBOARD_BUCKETS.includes(key as OcrReviewDashboardBucket)) {
    return key as OcrReviewDashboardBucket;
  }
  return null;
}

export function buildOcrReviewHref(gudang: string, bucket: OcrReviewDashboardBucket): string {
  const params = new URLSearchParams();
  params.set("gudang", gudang);
  params.set("status", bucket);
  return `/ocr-review?${params.toString()}`;
}

export type GudangDashboardCounts = Record<OcrReviewDashboardBucket, number>;

export function emptyGudangCounts(): GudangDashboardCounts {
  return Object.fromEntries(OCR_REVIEW_DASHBOARD_BUCKETS.map((b) => [b, 0])) as GudangDashboardCounts;
}

export function countDocsByGudangAndBucket(
  docs: OcrSheetDocument[],
  gudangList: string[]
): { gudang: string; counts: GudangDashboardCounts }[] {
  const gudangSet = new Set(gudangList);
  const seenGudang = new Set<string>();
  const byGudang = new Map<string, GudangDashboardCounts>();

  for (const g of gudangList) {
    seenGudang.add(g);
    byGudang.set(g, emptyGudangCounts());
  }

  for (const doc of docs) {
    const g = doc.gudang?.trim() || "Tanpa gudang";
    if (gudangSet.size && !gudangSet.has(g) && g !== "Tanpa gudang") continue;
    if (!byGudang.has(g)) {
      seenGudang.add(g);
      byGudang.set(g, emptyGudangCounts());
    }
    const bucket = classifyOcrReviewDashboardBucket(doc);
    const counts = byGudang.get(g)!;
    counts[bucket] += 1;
  }

  return [...seenGudang]
    .sort((a, b) => a.localeCompare(b, "id"))
    .map((gudang) => ({ gudang, counts: byGudang.get(gudang) ?? emptyGudangCounts() }));
}

export function resolveDashboardGudangList(
  profileGudang: string[] | undefined,
  docs: OcrSheetDocument[]
): string[] {
  if (profileGudang?.length) return [...profileGudang].sort((a, b) => a.localeCompare(b, "id"));
  const fromDocs = new Set<string>();
  for (const d of docs) {
    const g = d.gudang?.trim();
    if (g) fromDocs.add(g);
  }
  return [...fromDocs].sort((a, b) => a.localeCompare(b, "id"));
}
