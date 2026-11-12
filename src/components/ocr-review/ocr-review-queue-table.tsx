"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { OcrSheetDocument } from "@/lib/services/ocr-sheet-list";
import { sortOcrReviewDocs, type OcrReviewSortMode } from "@/lib/ocr-review/list-filters";
import { ReviewStatusBadge } from "./review-status-badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { WarehouseWaitBadge, WorkflowTimelineCompact } from "./workflow-timeline";

const SORT_OPTIONS: { value: OcrReviewSortMode; label: string }[] = [
  { value: "wait_review", label: "Terlama belum ditinjau" },
  { value: "kirim_desc", label: "Kirim terbaru" },
  { value: "tanggal_sj_desc", label: "Tanggal SJ terbaru" },
];

export function OcrReviewQueueTable({
  docs,
  initialSort = "wait_review",
}: {
  docs: OcrSheetDocument[];
  initialSort?: OcrReviewSortMode;
}) {
  const [sort, setSort] = useState<OcrReviewSortMode>(initialSort);
  const [expanded, setExpanded] = useState<string | null>(null);

  const sorted = useMemo(() => sortOcrReviewDocs(docs, sort), [docs, sort]);

  if (!docs.length) {
    return (
      <p className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
        Belum ada Surat Jalan dari supplier — atau tidak ada untuk gudang Anda.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 print:hidden">
        <p className="text-sm text-slate-600">
          <strong className="text-slate-900">{sorted.length}</strong> Surat Jalan
        </p>
        <label className="flex items-center gap-2 text-xs font-medium text-slate-600">
          Urutkan
          <select
            className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm text-slate-800"
            value={sort}
            onChange={(e) => setSort(e.target.value as OcrReviewSortMode)}
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-slate-600">
            <tr>
              <th className="px-4 py-3">Tunggu tinjauan</th>
              <th className="px-4 py-3">Tanggal SJ</th>
              <th className="px-4 py-3">No. SJ</th>
              <th className="px-4 py-3">Supplier</th>
              <th className="px-4 py-3">Gudang</th>
              <th className="px-4 py-3">OCR</th>
              <th className="px-4 py-3">Status tinjauan</th>
              <th className="px-4 py-3">Timeline</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sorted.map((d) => (
              <tr key={d.docKey} className="align-top hover:bg-slate-50">
                <td className="whitespace-nowrap px-4 py-3">
                  <WarehouseWaitBadge fields={d} />
                </td>
                <td className="whitespace-nowrap px-4 py-3">{d.tanggal || "—"}</td>
                <td className="px-4 py-3 font-medium text-slate-900">{d.noSuratJalan || "—"}</td>
                <td className="px-4 py-3">{d.supplier}</td>
                <td className="px-4 py-3">{d.gudang || "—"}</td>
                <td className="px-4 py-3">
                  <StatusBadge
                    label={d.lineStatus}
                    tone={d.lineStatus === "CEK" ? "warning" : "success"}
                  />
                </td>
                <td className="px-4 py-3">
                  <ReviewStatusBadge status={d.statusReview} />
                </td>
                <td className="min-w-[200px] px-4 py-3">
                  {expanded === d.docKey ? (
                    <WorkflowTimelineCompact fields={d} />
                  ) : (
                    <button
                      type="button"
                      className="text-xs font-medium text-blue-600 hover:underline"
                      onClick={() => setExpanded(d.docKey)}
                    >
                      Lihat timeline
                    </button>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/ocr-review/${d.docKey}`}
                    className="font-medium text-blue-600 hover:underline"
                  >
                    Detail
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
