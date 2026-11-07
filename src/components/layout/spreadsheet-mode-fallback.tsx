import Link from "next/link";
import { getGoogleExportConfigOptional } from "@/lib/providers/google-workspace";
import { getInternalSheetId } from "@/lib/config/internal-sheet";

function sheetUrl(id: string) {
  return `https://docs.google.com/spreadsheets/d/${id}/edit`;
}

export function SpreadsheetModeFallback({ moduleTitle }: { moduleTitle: string }) {
  const ocr = getGoogleExportConfigOptional();
  const supplierId = process.env.SUPPLIER_SHEET_ID?.trim() || "156m4HFAUnqubtCJumBJZ9BCCel_kNVcU_ZV9kHi4HtY";

  return (
    <div className="max-w-2xl rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-700">
      <h2 className="text-base font-semibold text-slate-900">{moduleTitle}</h2>
      <p className="mt-2">
        Modul ini biasanya mengambil data dari <strong>Supabase</strong>. Deploy Anda memakai{" "}
        <strong>mode spreadsheet</strong> (tanpa <code className="text-xs">DATABASE_URL</code>), jadi halaman ini
        tidak bisa memuat data database.
      </p>
      <p className="mt-3 font-medium text-slate-900">Yang tetap jalan:</p>
      <ul className="mt-2 list-inside list-disc space-y-1">
        <li>
          <Link href="/supplier" className="text-blue-600 hover:underline">
            Portal supplier
          </Link>{" "}
          — upload &amp; OCR
        </li>
        <li>
          <Link href="/surat-jalan" className="text-blue-600 hover:underline">
            Surat Jalan Documents
          </Link>{" "}
          — ringkasan dari spreadsheet export OCR
        </li>
        <li>
          <Link href="/integrations" className="text-blue-600 hover:underline">
            Integrations
          </Link>{" "}
          — status koneksi Gemini / Google
        </li>
      </ul>
      <p className="mt-4 font-medium text-slate-900">Spreadsheet operasional:</p>
      <ul className="mt-2 space-y-1">
        {ocr && (
          <li>
            <a href={sheetUrl(ocr.sheetId)} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
              Hasil OCR Surat Jalan
            </a>
          </li>
        )}
        <li>
          <a href={sheetUrl(supplierId)} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
            Akun supplier
          </a>
        </li>
        <li>
          <a href={sheetUrl(getInternalSheetId())} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
            Akun internal (admin)
          </a>
        </li>
      </ul>
    </div>
  );
}
