import Link from "next/link";
import type { OcrSheetDocument } from "@/lib/services/ocr-sheet-list";
import { ReviewStatusBadge } from "./review-status-badge";
import { StatusBadge } from "@/components/ui/status-badge";

export function OcrReviewQueueTable({ docs }: { docs: OcrSheetDocument[] }) {
  if (!docs.length) {
    return (
      <p className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
        Belum ada Surat Jalan dari supplier — atau tidak ada untuk gudang Anda.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
      <table className="min-w-full text-sm">
        <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-slate-600">
          <tr>
            <th className="px-4 py-3">Tanggal SJ</th>
            <th className="px-4 py-3">No. SJ</th>
            <th className="px-4 py-3">Supplier</th>
            <th className="px-4 py-3">Gudang</th>
            <th className="px-4 py-3">OCR</th>
            <th className="px-4 py-3">Status tinjauan</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {docs.map((d) => (
            <tr key={d.docKey} className="hover:bg-slate-50">
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
  );
}
