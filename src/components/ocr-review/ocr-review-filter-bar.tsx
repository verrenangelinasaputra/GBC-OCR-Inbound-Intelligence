"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";
import {
  OCR_REVIEW_DASHBOARD_BUCKETS,
  ocrReviewDashboardBucketLabel,
  type OcrReviewDashboardBucket,
} from "@/lib/ocr-review/workflow-status";
import { SJ_MONTH_OPTIONS } from "@/lib/surat-jalan/tanggal-sj";

function selectClass() {
  return "rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400";
}

export function OcrReviewFilterBar({
  years,
  gudang,
  status,
  year,
  month,
}: {
  years: number[];
  gudang?: string;
  status?: OcrReviewDashboardBucket;
  year?: number;
  month?: number;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const pushParams = useCallback(
    (updates: Record<string, string | undefined>) => {
      const next = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value === undefined || value === "") next.delete(key);
        else next.set(key, value);
      }
      const q = next.toString();
      router.push(q ? `/ocr-review?${q}` : "/ocr-review");
    },
    [router, searchParams]
  );

  const hasFilter = useMemo(
    () => Boolean(gudang || status || year || month),
    [gudang, status, year, month]
  );

  return (
    <div className="mb-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-end gap-4">
        <label className="flex min-w-[120px] flex-col gap-1 text-xs font-medium text-slate-600">
          Tahun
          <select
            className={selectClass()}
            value={year ?? ""}
            onChange={(e) => {
              const v = e.target.value;
              pushParams({ year: v || undefined });
            }}
          >
            <option value="">Semua tahun</option>
            {years.map((y) => (
              <option key={y} value={String(y)}>
                {y}
              </option>
            ))}
          </select>
        </label>

        <label className="flex min-w-[140px] flex-col gap-1 text-xs font-medium text-slate-600">
          Bulan
          <select
            className={selectClass()}
            value={month ?? ""}
            onChange={(e) => {
              const v = e.target.value;
              pushParams({ month: v || undefined });
            }}
          >
            <option value="">Semua bulan</option>
            {SJ_MONTH_OPTIONS.map((m) => (
              <option key={m.value} value={String(m.value)}>
                {m.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex min-w-[200px] flex-1 flex-col gap-1 text-xs font-medium text-slate-600">
          Status tinjauan
          <select
            className={selectClass()}
            value={status ?? ""}
            onChange={(e) => {
              const v = e.target.value;
              pushParams({ status: v || undefined });
            }}
          >
            <option value="">Semua status</option>
            {OCR_REVIEW_DASHBOARD_BUCKETS.map((bucket) => (
              <option key={bucket} value={bucket}>
                {ocrReviewDashboardBucketLabel(bucket)}
              </option>
            ))}
          </select>
        </label>

        {hasFilter ? (
          <button
            type="button"
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
            onClick={() => router.push("/ocr-review")}
          >
            Reset filter
          </button>
        ) : null}
      </div>

      {gudang ? (
        <p className="mt-3 text-xs text-slate-500">
          Filter gudang dari dashboard: <strong className="text-slate-800">{gudang}</strong> —{" "}
          <button
            type="button"
            className="text-blue-600 hover:underline"
            onClick={() => pushParams({ gudang: undefined })}
          >
            hapus
          </button>
        </p>
      ) : null}
    </div>
  );
}
