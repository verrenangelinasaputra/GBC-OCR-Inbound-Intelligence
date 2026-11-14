"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { DbmInboundRecord } from "@/lib/dbm/dbm-inbound-types";
import { isDbmAccurateExported } from "@/lib/dbm/accurate-transaction-import";
import { Download, Loader2 } from "lucide-react";

export function DataBarangMasukExportPanel({
  rows,
  canExport,
}: {
  rows: DbmInboundRecord[];
  canExport: boolean;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showExported, setShowExported] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const router = useRouter();

  const visibleRows = useMemo(
    () => (showExported ? rows : rows.filter((r) => !isDbmAccurateExported(r))),
    [rows, showExported]
  );

  const exportableKeys = useMemo(
    () => visibleRows.filter((r) => !isDbmAccurateExported(r)).map((r) => r.rowKey),
    [visibleRows]
  );

  const allVisibleSelected =
    exportableKeys.length > 0 && exportableKeys.every((k) => selected.has(k));

  function toggleRow(rowKey: string, disabled: boolean) {
    if (disabled) return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(rowKey)) next.delete(rowKey);
      else next.add(rowKey);
      return next;
    });
  }

  function toggleSelectAllVisible() {
    if (allVisibleSelected) {
      setSelected((prev) => {
        const next = new Set(prev);
        for (const k of exportableKeys) next.delete(k);
        return next;
      });
    } else {
      setSelected((prev) => {
        const next = new Set(prev);
        for (const k of exportableKeys) next.add(k);
        return next;
      });
    }
  }

  async function exportSelected() {
    const keys = [...selected].filter((k) => {
      const row = rows.find((r) => r.rowKey === k);
      return row && !isDbmAccurateExported(row);
    });
    if (!keys.length) {
      setError("Pilih minimal satu baris yang belum diekspor Accurate.");
      return;
    }
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/data-barang-masuk/export-accurate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rowKeys: keys }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? `Ekspor gagal (${res.status})`);
      }
      const blob = await res.blob();
      const cd = res.headers.get("Content-Disposition") ?? "";
      const m = /filename="([^"]+)"/.exec(cd);
      const fileName = m?.[1] ?? "transaction-item-import.xlsx";
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
      setSelected(new Set());
      setMessage(`${keys.length} baris diekspor — kolom Ekspor Accurate di spreadsheet sudah diisi.`);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ekspor gagal");
    } finally {
      setBusy(false);
    }
  }

  if (!rows.length) return null;

  return (
    <section className="mb-8">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Ekspor ke Accurate</h2>
          <p className="text-sm text-slate-600">
            Format kolom mengikuti template <em>transaction-item-import-item-id</em>. Baris yang sudah diekspor ditandai di spreadsheet.
          </p>
        </div>
        {canExport ? (
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
              onClick={toggleSelectAllVisible}
              disabled={!exportableKeys.length || busy}
            >
              {allVisibleSelected ? "Hapus semua centang" : "Pilih semua (belum ekspor)"}
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
              onClick={() => void exportSelected()}
              disabled={busy || selected.size === 0}
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              Export Accurate ({selected.size})
            </button>
          </div>
        ) : (
          <p className="text-sm text-amber-800">Akun Anda tidak punya izin ekspor DBM.</p>
        )}
      </div>

      <label className="mb-3 flex items-center gap-2 text-sm text-slate-600">
        <input
          type="checkbox"
          checked={showExported}
          onChange={(e) => setShowExported(e.target.checked)}
          className="rounded border-slate-300"
        />
        Tampilkan baris yang sudah diekspor Accurate
      </label>

      {error ? <p className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p> : null}
      {message ? (
        <p className="mb-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">{message}</p>
      ) : null}

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-slate-600">
            <tr>
              {canExport ? <th className="w-10 px-2 py-3" /> : null}
              <th className="px-3 py-3">Produk</th>
              <th className="px-3 py-3">Kode SKU</th>
              <th className="px-3 py-3">Jumlah</th>
              <th className="px-3 py-3">Gudang</th>
              <th className="px-3 py-3">No. SJ</th>
              <th className="px-3 py-3">Supplier</th>
              <th className="px-3 py-3">Ekspor Accurate</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {visibleRows.map((r) => {
              const exported = isDbmAccurateExported(r);
              const product = r.namaProdukAcuan || r.namaInternalAccurate || r.namaBarangOcr;
              return (
                <tr key={r.rowKey} className={exported ? "bg-slate-50 text-slate-600" : "bg-white hover:bg-slate-50"}>
                  {canExport ? (
                    <td className="px-2 py-2.5">
                      <input
                        type="checkbox"
                        className="rounded border-slate-300"
                        checked={selected.has(r.rowKey)}
                        disabled={exported || busy}
                        onChange={() => toggleRow(r.rowKey, exported)}
                        aria-label={`Pilih ${product}`}
                      />
                    </td>
                  ) : null}
                  <td className="px-3 py-2.5 font-medium text-slate-900">{product}</td>
                  <td className="px-3 py-2.5 text-xs">{r.skus || r.skuLengkap || "—"}</td>
                  <td className="px-3 py-2.5 tabular-nums">{r.jumlah || "—"}</td>
                  <td className="px-3 py-2.5 text-xs">{r.gudang}</td>
                  <td className="px-3 py-2.5">
                    <Link href={`/ocr-review/${encodeURIComponent(r.docKey)}`} className="text-blue-600 hover:underline">
                      {r.noSj || "—"}
                    </Link>
                  </td>
                  <td className="px-3 py-2.5 text-xs">{r.supplier}</td>
                  <td className="px-3 py-2.5 text-xs">
                    {exported ? (
                      <span className="rounded bg-emerald-100 px-2 py-0.5 font-medium text-emerald-800">
                        Ya{r.accurateExportedAt ? ` · ${r.accurateExportedAt}` : ""}
                      </span>
                    ) : (
                      <span className="text-slate-400">Belum</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!visibleRows.length ? (
          <p className="p-6 text-center text-sm text-slate-500">
            Semua baris sudah diekspor — centang &quot;Tampilkan baris yang sudah diekspor&quot; untuk melihat riwayat.
          </p>
        ) : null}
      </div>
    </section>
  );
}