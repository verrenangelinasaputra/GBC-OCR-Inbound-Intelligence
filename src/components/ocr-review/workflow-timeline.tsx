"use client";

import {
  buildWorkflowSteps,
  formatDurationMs,
  formatWorkflowShort,
  warehouseReviewWaitMs,
  type WorkflowStampFields,
} from "@/lib/ocr-review/workflow-timeline";
import { normalizeOcrReviewStatus } from "@/lib/ocr-review/workflow-status";

export function WarehouseWaitBadge({ fields }: { fields: WorkflowStampFields }) {
  const status = normalizeOcrReviewStatus(fields.statusReview);
  const wait = warehouseReviewWaitMs(fields);
  const active = status === "BELUM_DITINJAU";

  if (wait == null) {
    const title = active
      ? "Kolom TS Kirim Supplier (W) kosong — upload ulang setelah deploy atau isi timestamp kirim di sheet."
      : "Tidak bisa hitung durasi tanpa TS Kirim Supplier dan TS Ditinjau Gudang.";
    return (
      <span className="text-xs text-slate-500" title={title}>
        —
      </span>
    );
  }

  if (active) {
    return (
      <span
        className="inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-950"
        title="Belum ditinjau gudang"
      >
        {formatDurationMs(wait)}
      </span>
    );
  }

  return (
    <span className="text-xs font-medium text-slate-700" title="Lama tunggu dari kirim supplier sampai ditinjau gudang">
      {formatDurationMs(wait)}
    </span>
  );
}

export function WorkflowTimelineCompact({ fields, className = "" }: { fields: WorkflowStampFields; className?: string }) {
  const steps = buildWorkflowSteps(fields);
  return (
    <ul className={`space-y-1 text-xs text-slate-600 ${className}`}>
      {steps.map((s) => (
        <li key={s.key} className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0">
          <span className={s.done ? "font-medium text-slate-800" : "text-slate-400"}>{s.label}</span>
          <span className={s.done ? "text-slate-500" : "text-slate-300"}>·</span>
          <span className={s.done ? "text-slate-700" : "italic text-slate-400"}>
            {s.done ? formatWorkflowShort(s.at) : "belum"}
          </span>
        </li>
      ))}
    </ul>
  );
}
