import Link from "next/link";
import type { SkuMappingLineRow } from "@/lib/services/ocr-sheet-sku-mapping";
import { StatusBadge } from "@/components/ui/status-badge";

export function SkuMappingSelesaiTable({ rows }: { rows: SkuMappingLineRow[] }) {
  if (!rows.length) {
    return (
      <p className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
        Belum ada Surat Jalan dengan status tinjauan <strong>Selesai</strong>. Setelah supplier mengonfirmasi
        data, baris item akan muncul di sini untuk pemetaan SKU.
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
            <th className="px-4 py-3">Nama barang (OCR)</th>
            <th className="px-4 py-3">Banyaknya</th>
            <th className="px-4 py-3">Isi</th>
            <th className="px-4 py-3">Jumlah</th>
            <th className="px-4 py-3">SKU internal</th>
            <th className="px-4 py-3">Sample</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((r) => (
            <tr key={r.rowKey} className="hover:bg-slate-50">
              <td className="whitespace-nowrap px-4 py-3">{r.tanggal || "—"}</td>
              <td className="px-4 py-3 font-medium text-slate-900">{r.noSuratJalan || "—"}</td>
              <td className="px-4 py-3">{r.supplier}</td>
              <td className="px-4 py-3">{r.gudang || "—"}</td>
              <td className="px-4 py-3">{r.namaBarang || "—"}</td>
              <td className="px-4 py-3">{r.banyaknya || "—"}</td>
              <td className="px-4 py-3">{r.isi || "—"}</td>
              <td className="px-4 py-3">{r.jumlah || "—"}</td>
              <td className="px-4 py-3">
                <StatusBadge label="Belum dimapping" tone="warning" />
              </td>
              <td className="px-4 py-3 text-xs text-slate-600">{r.sampleType || "—"}</td>
              <td className="px-4 py-3 text-right">
                <Link href={`/ocr-review/${r.docKey}`} className="font-medium text-blue-600 hover:underline">
                  SJ
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
