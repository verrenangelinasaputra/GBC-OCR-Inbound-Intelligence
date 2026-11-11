import Link from "next/link";
import {
  buildOcrReviewHref,
  type GudangDashboardCounts,
} from "@/lib/ocr-review/dashboard-bucket";
import {
  OCR_REVIEW_DASHBOARD_BUCKETS,
  ocrReviewDashboardBucketLabel,
  ocrReviewDashboardBucketTone,
  type OcrReviewDashboardBucket,
} from "@/lib/ocr-review/workflow-status";

const CARD_SURFACE: Record<string, string> = {
  neutral: "border-slate-200 hover:border-slate-300 hover:bg-slate-50",
  info: "border-blue-200 hover:border-blue-300 hover:bg-blue-50/50",
  success: "border-emerald-200 hover:border-emerald-300 hover:bg-emerald-50/50",
  warning: "border-amber-200 hover:border-amber-300 hover:bg-amber-50/50",
  danger: "border-red-200 hover:border-red-300 hover:bg-red-50/50",
};

const COUNT_COLOR: Record<string, string> = {
  neutral: "text-slate-900",
  info: "text-blue-800",
  success: "text-emerald-800",
  warning: "text-amber-900",
  danger: "text-red-800",
};

function StatusCard({
  gudang,
  bucket,
  count,
}: {
  gudang: string;
  bucket: OcrReviewDashboardBucket;
  count: number;
}) {
  const tone = ocrReviewDashboardBucketTone(bucket);
  const mappedTone = tone === "neutral" ? "neutral" : tone;
  return (
    <Link
      href={buildOcrReviewHref(gudang, bucket)}
      className={`block rounded-xl border bg-white p-4 shadow-sm transition ${CARD_SURFACE[mappedTone] ?? CARD_SURFACE.neutral}`}
    >
      <p className="text-xs font-medium text-slate-600">{ocrReviewDashboardBucketLabel(bucket)}</p>
      <p className={`mt-2 text-3xl font-semibold tabular-nums ${COUNT_COLOR[mappedTone] ?? COUNT_COLOR.neutral}`}>
        {count}
      </p>
      <p className="mt-2 text-[11px] text-slate-500">Klik untuk buka daftar tinjauan</p>
    </Link>
  );
}

export function GudangReviewStatusCards({
  sections,
}: {
  sections: { gudang: string; counts: GudangDashboardCounts }[];
}) {
  if (!sections.length) {
    return (
      <p className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
        Belum ada data Surat Jalan di spreadsheet — atau gudang profil belum cocok dengan data.
      </p>
    );
  }

  return (
    <div className="space-y-8">
      {sections.map(({ gudang, counts }) => (
        <section key={gudang}>
          <h2 className="text-sm font-semibold text-slate-900">{gudang}</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {OCR_REVIEW_DASHBOARD_BUCKETS.map((bucket) => (
              <StatusCard key={bucket} gudang={gudang} bucket={bucket} count={counts[bucket]} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
