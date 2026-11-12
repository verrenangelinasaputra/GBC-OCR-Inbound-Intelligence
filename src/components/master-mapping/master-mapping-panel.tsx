"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { MasterMappingEntry } from "@/lib/sku-matching/master-mapping-types";

export function MasterMappingPanel({
  canEdit,
  initialOcrName = "",
}: {
  canEdit: boolean;
  initialOcrName?: string;
}) {
  const [entries, setEntries] = useState<MasterMappingEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    namaBarangOcr: initialOcrName,
    skuLengkap: "",
    namaInternalAccurate: "",
    namaProdukAcuan: "",
    kategoriUtama: "",
    skus: "",
    barcode: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/master-mapping");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal memuat");
      setEntries(data.entries ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal memuat");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (initialOcrName) {
      setForm((f) => ({ ...f, namaBarangOcr: initialOcrName }));
    }
  }, [initialOcrName]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canEdit) return;
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch("/api/master-mapping", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal simpan");
      setMessage("Mapping tersimpan. Kembali ke Product SKU Mapping untuk final DBM.");
      setForm({
        namaBarangOcr: "",
        skuLengkap: "",
        namaInternalAccurate: "",
        namaProdukAcuan: "",
        kategoriUtama: "",
        skus: "",
        barcode: "",
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal simpan");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-slate-600">
          Alias nama barang OCR → data SKU. Dipakai ketika tidak ada fuzzy match di REKAP SKUL.
        </p>
        <Link href="/sku-mapping" className="text-sm font-medium text-blue-600 hover:underline">
          ← Kembali ke Product SKU Mapping
        </Link>
      </div>

      {message ? (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-900">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-800">{error}</p>
      ) : null}

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-base font-semibold text-slate-900">Tambah mapping baru</h2>
        {!canEdit ? (
          <p className="mt-2 text-sm text-amber-800">
            Akun Anda hanya bisa melihat. Minta admin mengaktifkan modul <strong>master_mapping</strong> dengan izin
            edit.
          </p>
        ) : (
          <form onSubmit={(e) => void onSubmit(e)} className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1 sm:col-span-2">
              <span className="text-xs font-medium text-slate-600">Nama barang (teks OCR)</span>
              <input
                required
                value={form.namaBarangOcr}
                onChange={(e) => setForm((f) => ({ ...f, namaBarangOcr: e.target.value }))}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-slate-600">SKU lengkap</span>
              <input
                value={form.skuLengkap}
                onChange={(e) => setForm((f) => ({ ...f, skuLengkap: e.target.value }))}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-slate-600">Nama produk acuan</span>
              <input
                value={form.namaProdukAcuan}
                onChange={(e) => setForm((f) => ({ ...f, namaProdukAcuan: e.target.value }))}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
            </label>
            <label className="flex flex-col gap-1 sm:col-span-2">
              <span className="text-xs font-medium text-slate-600">Nama internal Accurate</span>
              <input
                value={form.namaInternalAccurate}
                onChange={(e) => setForm((f) => ({ ...f, namaInternalAccurate: e.target.value }))}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-slate-600">Kategori utama</span>
              <input
                value={form.kategoriUtama}
                onChange={(e) => setForm((f) => ({ ...f, kategoriUtama: e.target.value }))}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-slate-600">SKUS</span>
              <input
                value={form.skus}
                onChange={(e) => setForm((f) => ({ ...f, skus: e.target.value }))}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
            </label>
            <label className="flex flex-col gap-1 sm:col-span-2">
              <span className="text-xs font-medium text-slate-600">Barcode</span>
              <input
                value={form.barcode}
                onChange={(e) => setForm((f) => ({ ...f, barcode: e.target.value }))}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
            </label>
            <div className="sm:col-span-2">
              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? "Menyimpan…" : "Simpan mapping"}
              </button>
            </div>
          </form>
        )}
      </section>

      <section className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <h2 className="border-b border-slate-100 px-4 py-3 text-sm font-semibold text-slate-800">
          Daftar Master Mapping {loading ? "…" : `(${entries.length})`}
        </h2>
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-600">
            <tr>
              <th className="px-3 py-2">Nama OCR</th>
              <th className="px-3 py-2">Produk acuan</th>
              <th className="px-3 py-2">SKU</th>
              <th className="px-3 py-2">Oleh</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {entries.map((e) => (
              <tr key={e.rowNo}>
                <td className="px-3 py-2 font-medium">{e.namaBarangOcr}</td>
                <td className="px-3 py-2">{e.namaProdukAcuan || "—"}</td>
                <td className="px-3 py-2 text-xs">{e.skuLengkap || "—"}</td>
                <td className="px-3 py-2 text-xs text-slate-500">{e.addedBy || "—"}</td>
              </tr>
            ))}
            {!loading && entries.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-slate-500">
                  Belum ada mapping kustom.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </section>
    </div>
  );
}
