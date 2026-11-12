"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import type { OcrSheetDocument } from "@/lib/services/ocr-sheet-list";
import {
  sortOcrReviewDocsByColumn,
  type OcrReviewColumnSortKey,
  type SortDir,
} from "@/lib/ocr-review/list-filters";
import { ReviewStatusBadge } from "./review-status-badge";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  SupplierRevisionWaitBadge,
  WarehouseVerifyWaitBadge,
  WarehouseWaitBadge,
  WorkflowTimelineCompact,
} from "./workflow-timeline";

const SORTABLE_COLUMNS: { key: OcrReviewColumnSortKey; label: string; className?: string }[] = [
  { key: "wait_review", label: "Tunggu tinjauan" },
  { key: "wait_verify", label: "Tunggu verifikasi" },
  { key: "wait_supplier_confirm", label: "Tunggu konfirmasi supplier" },
  { key: "tanggal", label: "Tanggal SJ" },
  { key: "noSuratJalan", label: "No. SJ" },
  { key: "supplier", label: "Supplier" },
  { key: "gudang", label: "Gudang" },
  { key: "lineStatus", label: "OCR" },
  { key: "statusReview", label: "Status tinjauan" },
];

function SortableColumnHeader({
  label,
  active,
  dir,
  onClick,
  className = "",
}: {
  label: string;
  active: boolean;
  dir: SortDir;
  onClick: () => void;
  className?: string;
}) {
  const Icon = active ? (dir === "asc" ? ArrowUp : ArrowDown) : ArrowUpDown;
  return (
    <th className={`px-4 py-3 ${className}`}>
      <button
        type="button"
        onClick={onClick}
        className="inline-flex max-w-full items-center gap-1 text-left uppercase tracking-wide hover:text-slate-900"
      >
        <span className="min-w-0">{label}</span>
        <Icon
          className={`h-3.5 w-3.5 shrink-0 ${active ? "text-slate-800" : "text-slate-400"}`}
          aria-hidden
        />
      </button>
    </th>
  );
}

export function OcrReviewQueueTable({ docs }: { docs: OcrSheetDocument[] }) {
  const [sortKey, setSortKey] = useState<OcrReviewColumnSortKey>("wait_review");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [expanded, setExpanded] = useState<string | null>(null);

  const toggleSort = (key: OcrReviewColumnSortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key.startsWith("wait_") ? "desc" : "asc");
    }
  };

  const sorted = useMemo(() => sortOcrReviewDocsByColumn(docs, sortKey, sortDir), [docs, sortKey, sortDir]);

  if (!docs.length) {
    return (
      <p className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
        Belum ada Surat Jalan dari supplier — atau tidak ada untuk gudang Anda.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-600 print:hidden">
        <strong className="text-slate-900">{sorted.length}</strong> Surat Jalan
      </p>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs font-medium text-slate-600">
            <tr>
              {SORTABLE_COLUMNS.map((col) => (
                <SortableColumnHeader
                  key={col.key}
                  label={col.label}
                  active={sortKey === col.key}
                  dir={sortDir}
                  onClick={() => toggleSort(col.key)}
                  className={col.className}
                />
              ))}
              <th className="px-4 py-3 font-medium uppercase tracking-wide">Timeline</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sorted.map((d) => (
              <tr key={d.docKey} className="align-top hover:bg-slate-50">
                <td className="whitespace-nowrap px-4 py-3">
                  <WarehouseWaitBadge fields={d} />
                </td>
                <td className="whitespace-nowrap px-4 py-3">
                  <WarehouseVerifyWaitBadge fields={d} />
                </td>
                <td className="whitespace-nowrap px-4 py-3">
                  <SupplierRevisionWaitBadge fields={d} />
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
