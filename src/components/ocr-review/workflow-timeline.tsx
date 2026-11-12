"use client";

import {
  buildWorkflowSteps,
  formatDurationMs,
  formatWorkflowShort,
  supplierRevisionWaitMs,
  warehouseReviewWaitMs,
  warehouseVerifyWaitMs,
  type WorkflowStampFields,
} from "@/lib/ocr-review/workflow-timeline";
import { normalizeOcrReviewStatus } from "@/lib/ocr-review/workflow-status";

function WorkflowDurationCell({
  wait,
  active,
  activeTitle,
  idleTitle,
  missingTitle,
  activeClassName = "bg-amber-100 text-amber-950",
}: {
  wait: number | null;
  active: boolean;
  activeTitle: string;
  idleTitle: string;
  missingTitle?: string;
  activeClassName?: string;
}) {
  if (wait == null) {
    return (
      <span className="text-xs text-slate-500" title={missingTitle}>
        —
      </span>
    );
  }
  if (active) {
    return (
      <span
        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${activeClassName}`}
        title={activeTitle}
      >
        {formatDurationMs(wait)}
      </span>
    );
  }
  return (
    <span className="text-xs font-medium text-slate-700" title={idleTitle}>
      {formatDurationMs(wait)}
    </span>
  );
}

export function WarehouseWaitBadge({ fields }: { fields: WorkflowStampFields }) {
  const status = normalizeOcrReviewStatus(fields.statusReview);
  const wait = warehouseReviewWaitMs(fields);
  return (
    <WorkflowDurationCell
      wait={wait}
      active={status === "BELUM_DITINJAU"}
      activeTitle="Belum ditinjau gudang"
      idleTitle="Lama tunggu dari kirim supplier sampai ditinjau gudang"
      missingTitle={
        status === "BELUM_DITINJAU"
          ? "Kolom TS Kirim Supplier (W) kosong — upload ulang setelah deploy atau isi timestamp kirim di sheet."
          : "Tidak bisa hitung durasi tanpa TS Kirim Supplier dan TS Ditinjau Gudang."
      }
    />
  );
}

export function WarehouseVerifyWaitBadge({ fields }: { fields: WorkflowStampFields }) {
  const status = normalizeOcrReviewStatus(fields.statusReview);
  const wait = warehouseVerifyWaitMs(fields);
  return (
    <WorkflowDurationCell
      wait={wait}
      active={status === "SUDAH_DITINJAU"}
      activeClassName="bg-sky-100 text-sky-950"
      activeTitle="Menunggu verifikasi / approve gudang"
      idleTitle="Lama tunggu dari ditinjau sampai approve atau permintaan revisi"
      missingTitle="Butuh TS Ditinjau Gudang (X); aktif setelah ditinjau."
    />
  );
}

export function SupplierRevisionWaitBadge({ fields }: { fields: WorkflowStampFields }) {
  const status = normalizeOcrReviewStatus(fields.statusReview);
  const wait = supplierRevisionWaitMs(fields);
  return (
    <WorkflowDurationCell
      wait={wait}
      active={status === "MENUNGGU_REVISI_SUPPLIER"}
      activeClassName="bg-orange-100 text-orange-950"
      activeTitle="Menunggu konfirmasi supplier"
      idleTitle="Lama tunggu dari permintaan revisi gudang sampai konfirmasi supplier"
      missingTitle="Butuh TS Revisi Gudang (Y) — muncul setelah gudang minta revisi, berjalan sampai konfirmasi (AA)."
    />
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
