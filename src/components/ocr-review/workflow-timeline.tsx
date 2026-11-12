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
  if (status !== "BELUM_DITINJAU" || wait == null) {
    return <span className="text-slate-400">—</span>;
  }
  return (
    <span
      className="inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-950"
      title="Belum ditinjau gudang"
    >
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
