"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { getSkuRekapSpreadsheetEditUrl } from "@/lib/config/sku-mapping-sheets";
import type { SkuMappingWorkbenchRow } from "@/lib/sku-matching/sku-rekap-types";
import { StatusBadge } from "@/components/ui/status-badge";

function suggestionKey(s: { rowNo: string; skuLengkap: string }): string {
  return s.rowNo || s.skuLengkap;
}

export function SkuMappingWorkbench({
  rows,
  canFinalize,
}: {
  rows: SkuMappingWorkbenchRow[];
  canFinalize: boolean;
}) {
  const [selection, setSelection] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const r of rows) {
      const first = r.suggestions[0];
      if (first) init[r.line.rowKey] = suggestionKey(first);
    }
    return init;
  });
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [confirmKey, setConfirmKey] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [removed, setRemoved] = useState<Set<string>>(new Set());

  const visible = useMemo(
    () => rows.filter((r) => !removed.has(r.line.rowKey)),
    [rows, removed]
  );

  if (!visible.length) {
    return (
      <p className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
        Tidak ada baris menunggu mapping — semua sudah final DBM atau belum ada SJ berstatus{" "}
        <strong>Selesai</strong>.
      </p>
    );
  }

  const confirmRow = confirmKey ? visible.find((r) => r.line.rowKey === confirmKey) : null;
  const confirmSuggestion = confirmRow
    ? confirmRow.suggestions.find((s) => suggestionKey(s) === selection[confirmRow.line.rowKey])
    : null;

  async function submitFinalize(rowKey: string, catalogRowNo: string) {
    setBusyKey(rowKey);
    setMessage(null);
    try {
      const res = await fetch("/api/sku-mapping/finalize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rowKey, catalogRowNo }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Gagal simpan final DBM");
      setRemoved((prev) => new Set(prev).add(rowKey));
      setConfirmKey(null);
      setMessage("Baris tersimpan ke tab Data Barang Masuk.");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Gagal simpan");
    } finally {
      setBusyKey(null);
    }
  }

  return (
    <div className="space-y-4">
      {message ? (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-900">
          {message}
        </p>
      ) : null}

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-[1400px] text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-slate-600">
            <tr>
              <th className="px-3 py-3">Tanggal SJ</th>
              <th className="px-3 py-3">No. SJ</th>
              <th className="px-3 py-3">Supplier</th>
              <th className="px-3 py-3">Gudang</th>
              <th className="px-3 py-3">Nama barang (OCR)</th>
              <th className="px-3 py-3">Jumlah</th>
              <th className="px-3 py-3 min-w-[220px]">Pilihan SKU (top 3)</th>
              <th className="px-3 py-3">SKU Lengkap</th>
              <th className="px-3 py-3">Nama Internal Accurate</th>
              <th className="px-3 py-3">Nama Produk Acuan</th>
              <th className="px-3 py-3">Kategori</th>
              <th className="px-3 py-3">SKUS</th>
              <th className="px-3 py-3">Barcode</th>
              <th className="px-3 py-3">Sumber</th>
              <th className="px-3 py-3">Final DBM</th>
              <th className="px-3 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {visible.map((row) => {
              const selKey = selection[row.line.rowKey];
              const selected =
                row.suggestions.find((s) => suggestionKey(s) === selKey) ?? row.suggestions[0] ?? null;

              return (
                <tr key={row.line.rowKey} className="align-top hover:bg-slate-50/80">
                  <td className="whitespace-nowrap px-3 py-3">{row.line.tanggal || "—"}</td>
                  <td className="px-3 py-3 font-medium">{row.line.noSuratJalan || "—"}</td>
                  <td className="px-3 py-3">{row.line.supplier}</td>
                  <td className="px-3 py-3">{row.line.gudang || "—"}</td>
                  <td className="px-3 py-3 font-medium text-slate-900">{row.line.namaBarang || "—"}</td>
                  <td className="px-3 py-3">{row.line.jumlah || "—"}</td>
                  <td className="px-3 py-3">
                    {row.suggestions.length === 0 ? (
                      <div className="space-y-2">
                        <StatusBadge label="Tidak ada match" tone="danger" />
                        <a
                          href={getSkuRekapSpreadsheetEditUrl()}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-block rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-800 hover:bg-blue-100"
                        >
                          Tambah SKU baru
                        </a>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {row.suggestions.map((s) => (
                          <label key={suggestionKey(s)} className="flex cursor-pointer items-start gap-2">
                            <input
                              type="radio"
                              name={`sku-${row.line.rowKey}`}
                              checked={suggestionKey(s) === (selected ? suggestionKey(selected) : "")}
                              onChange={() =>
                                setSelection((prev) => ({
                                  ...prev,
                                  [row.line.rowKey]: suggestionKey(s),
                                }))
                              }
                              className="mt-1"
                            />
                            <span className="text-xs leading-snug">
                              <span className="font-medium">{s.namaProdukAcuan}</span>
                              <span className="block text-slate-500">
                                {Math.round(s.score * 100)}% · {s.skuLengkap}
                              </span>
                            </span>
                          </label>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-3 text-xs">{selected?.skuLengkap || "—"}</td>
                  <td className="px-3 py-3 text-xs">{selected?.namaInternalAccurate || "—"}</td>
                  <td className="px-3 py-3 text-xs">{selected?.namaProdukAcuan || "—"}</td>
                  <td className="px-3 py-3 text-xs">{selected?.kategoriUtama || "—"}</td>
                  <td className="px-3 py-3 text-xs">{selected?.skus || "—"}</td>
                  <td className="px-3 py-3 text-xs">{selected?.barcode || "—"}</td>
                  <td className="px-3 py-3 text-xs">{selected?.sumberLembar || "—"}</td>
                  <td className="px-3 py-3">
                    {selected ? (
                      <button
                        type="button"
                        title={
                          canFinalize
                            ? "Simpan ke Data Barang Masuk"
                            : "Akun tidak punya izin sku_mapping"
                        }
                        disabled={!canFinalize || busyKey === row.line.rowKey || !row.suggestions.length}
                        onClick={() => setConfirmKey(row.line.rowKey)}
                        className="whitespace-nowrap rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                      >
                        {busyKey === row.line.rowKey ? "…" : "Finalisasi"}
                      </button>
                    ) : (
                      <span className="text-xs text-slate-400">Pilih SKU</span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-right">
                    <Link href={`/ocr-review/${row.line.docKey}`} className="text-blue-600 hover:underline">
                      SJ
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {confirmRow && confirmSuggestion ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-lg rounded-xl bg-white p-5 shadow-lg">
            <h3 className="text-lg font-medium text-slate-900">Konfirmasi final DBM</h3>
            <p className="mt-2 text-sm text-slate-600">
              Barang <strong>{confirmRow.line.namaBarang}</strong> akan dipetakan ke{" "}
              <strong>{confirmSuggestion.namaProdukAcuan}</strong> ({confirmSuggestion.skuLengkap}) dan
              disimpan ke spreadsheet <strong>Data Barang Masuk</strong>. Lanjutkan?
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                onClick={() => setConfirmKey(null)}
                disabled={busyKey === confirmRow.line.rowKey}
              >
                Batal
              </button>
              <button
                type="button"
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                disabled={busyKey === confirmRow.line.rowKey}
                onClick={() => void submitFinalize(confirmRow.line.rowKey, confirmSuggestion.rowNo)}
              >
                {busyKey === confirmRow.line.rowKey ? "Menyimpan…" : "Ya, simpan final DBM"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
