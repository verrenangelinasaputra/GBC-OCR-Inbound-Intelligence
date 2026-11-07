import Link from "next/link";
import type { OcrSheetDocument } from "@/lib/services/ocr-sheet-list";
import { StatusBadge } from "@/components/ui/status-badge";
import { getGoogleExportConfigOptional } from "@/lib/providers/google-workspace";

export function SheetExportTable({ docs }: { docs: OcrSheetDocument[] }) {
  const sheet = getGoogleExportConfigOptional();

  return (
    <div className="space-y-4">
      <p className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-900">
        Data di bawah dibaca langsung dari spreadsheet hasil OCR
        {sheet ? (
          <>
            {" "}
            (
            <a
              href={`https://docs.google.com/spreadsheets/d/${sheet.sheetId}/edit`}
              target="_blank"
              rel="noreferrer"
              className="font-medium underline"
            >
              buka sheet
            </a>
            ).
          </>
        ) : (
          "."
        )}
      </p>
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-600">
            <tr>
              <th className="px-4 py-3">Ekspor</th>
              <th className="px-4 py-3">Tanggal SJ</th>
              <th className="px-4 py-3">No. Surat Jalan</th>
              <th className="px-4 py-3">Kendaraan</th>
              <th className="px-4 py-3">Baris</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">File</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {docs.map((d) => (
              <tr key={`${d.fileName}-${d.noSuratJalan}-${d.exportTimestamp}`} className="border-t">
                <td className="px-4 py-3 text-slate-600">{d.exportTimestamp || "—"}</td>
                <td className="px-4 py-3">{d.tanggal || "—"}</td>
                <td className="px-4 py-3 font-medium">{d.noSuratJalan || "—"}</td>
                <td className="px-4 py-3">{d.noKendaraan || "—"}</td>
                <td className="px-4 py-3">{d.lineCount}</td>
                <td className="px-4 py-3">
                  <StatusBadge label={d.lineStatus} tone={d.lineStatus === "CEK" ? "warning" : "success"} />
                </td>
                <td className="px-4 py-3">
                  {d.fileUrl ? (
                    <a href={d.fileUrl} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
                      Drive
                    </a>
                  ) : (
                    <span className="text-slate-400">{d.fileName || "—"}</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <Link
                    href={`/ocr-review/${d.docKey}`}
                    className="font-medium text-blue-600 hover:underline"
                  >
                    Open review
                  </Link>
                </td>
              </tr>
            ))}
            {docs.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-slate-500">
                  Belum ada baris di sheet OCR — minta supplier upload di{" "}
                  <Link href="/supplier" className="text-blue-600 hover:underline">
                    portal supplier
                  </Link>
                  .
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
