import Link from "next/link";
import { ocrReviewDashboardBucketLabel, type OcrReviewDashboardBucket } from "@/lib/ocr-review/workflow-status";
import { StatusBadge } from "@/components/ui/status-badge";

export function OcrReviewActiveFilters({
  gudang,
  status,
}: {
  gudang?: string;
  status?: OcrReviewDashboardBucket;
}) {
  if (!gudang && !status) return null;

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm">
      <span className="text-slate-600">Filter aktif:</span>
      {gudang ? <StatusBadge label={`Gudang: ${gudang}`} tone="info" /> : null}
      {status ? (
        <StatusBadge label={ocrReviewDashboardBucketLabel(status)} tone="warning" />
      ) : null}
      <Link href="/ocr-review" className="ml-auto text-blue-600 hover:underline">
        Hapus filter
      </Link>
    </div>
  );
}
