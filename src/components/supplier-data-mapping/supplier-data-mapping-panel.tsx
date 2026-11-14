"use client";

import clsx from "clsx";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { SupplierMasterDataRow } from "@/lib/supplier-mapping/types";

type SortKey = "tipeSupplier" | "kode" | "namaSupplier" | "sheetRow";
type SortDir = "asc" | "desc";

type FormState = {
  tipeSupplier: string;
  kode: string;
  namaSupplier: string;
};

const emptyForm = (): FormState => ({ tipeSupplier: "", kode: "", namaSupplier: "" });

export function SupplierDataMappingPanel({
  canEdit,
  isSuperAdmin,
  initialNamaSupplier = "",
}: {
  canEdit: boolean;
  isSuperAdmin: boolean;
  initialNamaSupplier?: string;
}) {
  const [rows, setRows] = useState<SupplierMasterDataRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [addForm, setAddForm] = useState<FormState>(() => ({
    ...emptyForm(),
    namaSupplier: initialNamaSupplier,
  }));
  const [editRow, setEditRow] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<FormState>(emptyForm);
  const [search, setSearch] = useState("");
  const [filterTipe, setFilterTipe] = useState("");
  const [filterKode, setFilterKode] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("kode");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const distinctTipe = useMemo(() => {
    const set = new Set<string>();
    for (const r of rows) {
      const t = r.tipeSupplier.trim();
      if (t) set.add(t);
    }
    return [...set].sort((a, b) => a.localeCompare(b, "id"));
  }, [rows]);

  const distinctKode = useMemo(() => {
    const set = new Set<string>();
    for (const r of rows) {
      const k = r.kode.trim();
      if (k) set.add(k);
    }
    return [...set].sort((a, b) => a.localeCompare(b, "id"));
  }, [rows]);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (filterTipe && r.tipeSupplier.trim() !== filterTipe) return false;
      if (filterKode && r.kode.trim().toUpperCase() !== filterKode.toUpperCase()) return false;
      if (q) {
        const hay = `${r.tipeSupplier} ${r.kode} ${r.namaSupplier}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [rows, search, filterTipe, filterKode]);

  const displayRows = useMemo(() => {
    const list = [...filteredRows];
    const dir = sortDir === "asc" ? 1 : -1;
    list.sort((a, b) => {
      if (sortKey === "sheetRow") return (a.sheetRow - b.sheetRow) * dir;
      const av = sortKey === "kode" ? a.kode.toUpperCase() : String(a[sortKey] ?? "").trim();
      const bv = sortKey === "kode" ? b.kode.toUpperCase() : String(b[sortKey] ?? "").trim();
      return av.localeCompare(bv, "id", { sensitivity: "base" }) * dir;
    });
    return list;
  }, [filteredRows, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  function SortableTh({
    label,
    column,
    className,
  }: {
    label: string;
    column: SortKey;
    className?: string;
  }) {
    const active = sortKey === column;
    return (
      <th className={clsx("px-3 py-2", className)}>
        <button
          type="button"
          onClick={() => toggleSort(column)}
          className={clsx(
            "inline-flex items-center gap-1 font-medium uppercase tracking-wide hover:text-slate-900",
            active ? "text-blue-700" : "text-slate-600"
          )}
        >
          {label}
          <span className="text-[10px] normal-case" aria-hidden>
            {active ? (sortDir === "asc" ? "↑" : "↓") : "↕"}
          </span>
        </button>
      </th>
    );
  }

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/supplier-data-mapping");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal memuat");
      setRows(data.rows ?? []);
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
    if (initialNamaSupplier) {
      setAddForm((f) => ({ ...f, namaSupplier: initialNamaSupplier }));
    }
  }, [initialNamaSupplier]);

  async function onAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!canEdit) return;
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch("/api/supplier-data-mapping", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(addForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal simpan");
      setMessage("Baris alias supplier tersimpan.");
      setAddForm(emptyForm());
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal simpan");
    } finally {
      setSaving(false);
    }
  }

  function startEdit(row: SupplierMasterDataRow) {
    setEditRow(row.sheetRow);
    setEditForm({
      tipeSupplier: row.tipeSupplier,
      kode: row.kode,
      namaSupplier: row.namaSupplier,
    });
    setMessage(null);
    setError(null);
  }

  function cancelEdit() {
    setEditRow(null);
    setEditForm(emptyForm());
  }

  async function saveEdit() {
    if (!canEdit || editRow == null) return;
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch("/api/supplier-data-mapping", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sheetRow: editRow, ...editForm }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal ubah");
      setMessage("Perubahan tersimpan.");
      cancelEdit();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal ubah");
    } finally {
      setSaving(false);
    }
  }

  async function onDelete(sheetRow: number) {
    if (!canEdit) return;
    if (!window.confirm("Hapus baris mapping ini dari sheet?")) return;
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch("/api/supplier-data-mapping", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sheetRow }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal hapus");
      if (editRow === sheetRow) cancelEdit();
      setMessage("Baris dihapus.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal hapus");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-8">
      <p className="text-sm text-slate-600">
        Opsi A: satu <strong>Kode</strong> bisa punya banyak baris dengan <strong>Nama Supplier</strong> berbeda
        (alias). Folder Drive memakai nama kanonik dari baris pertama untuk kode tersebut.
      </p>

      {message ? (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-900">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-800">{error}</p>
      ) : null}

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-base font-semibold text-slate-900">Tambah alias / supplier</h2>
        {!canEdit ? (
          <p className="mt-2 text-sm text-amber-800">
            Akun Anda hanya bisa melihat. Minta admin mengaktifkan modul{" "}
            <strong>supplier_data_mapping</strong>.
          </p>
        ) : (
          <form onSubmit={(e) => void onAdd(e)} className="mt-4 grid gap-4 sm:grid-cols-3">
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-slate-600">Tipe Supplier</span>
              <input
                value={addForm.tipeSupplier}
                onChange={(e) => setAddForm((f) => ({ ...f, tipeSupplier: e.target.value }))}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                placeholder="Mis. Prinsipal"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-slate-600">Kode</span>
              <input
                required
                value={addForm.kode}
                onChange={(e) => setAddForm((f) => ({ ...f, kode: e.target.value }))}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                placeholder="SS"
              />
            </label>
            <label className="flex flex-col gap-1 sm:col-span-1">
              <span className="text-xs font-medium text-slate-600">Nama Supplier (alias)</span>
              <input
                required
                value={addForm.namaSupplier}
                onChange={(e) => setAddForm((f) => ({ ...f, namaSupplier: e.target.value }))}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                placeholder="Nama di SJ / login"
              />
            </label>
            <div className="sm:col-span-3">
              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? "Menyimpan…" : "Simpan baris"}
              </button>
            </div>
          </form>
        )}
      </section>

      <section className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-4 py-3">
          <h2 className="text-sm font-semibold text-slate-800">
            Daftar mapping{" "}
            {loading ? "…" : `(${displayRows.length}${displayRows.length !== rows.length ? ` / ${rows.length}` : ""})`}
          </h2>
          <div className="mt-3 flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-end">
            <label className="flex min-w-[200px] flex-1 flex-col gap-1">
              <span className="text-xs font-medium text-slate-600">Cari</span>
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tipe, kode, atau nama…"
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
            </label>
            <label className="flex min-w-[140px] flex-col gap-1">
              <span className="text-xs font-medium text-slate-600">Filter tipe</span>
              <select
                value={filterTipe}
                onChange={(e) => setFilterTipe(e.target.value)}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
              >
                <option value="">Semua tipe</option>
                {distinctTipe.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex min-w-[120px] flex-col gap-1">
              <span className="text-xs font-medium text-slate-600">Filter kode</span>
              <select
                value={filterKode}
                onChange={(e) => setFilterKode(e.target.value)}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
              >
                <option value="">Semua kode</option>
                {distinctKode.map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </select>
            </label>
            {(search || filterTipe || filterKode) && (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setFilterTipe("");
                  setFilterKode("");
                }}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
              >
                Reset filter
              </button>
            )}
          </div>
        </div>
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs">
            <tr>
              <SortableTh label="Tipe" column="tipeSupplier" />
              <SortableTh label="Kode" column="kode" />
              <SortableTh label="Nama Supplier" column="namaSupplier" />
              {canEdit ? <th className="px-3 py-2 w-40 text-xs font-medium uppercase text-slate-600">Aksi</th> : null}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {displayRows.map((row) => {
              const editing = editRow === row.sheetRow;
              return (
                <tr key={row.sheetRow}>
                  <td className="px-3 py-2">
                    {editing ? (
                      <input
                        value={editForm.tipeSupplier}
                        onChange={(e) => setEditForm((f) => ({ ...f, tipeSupplier: e.target.value }))}
                        className="w-full rounded border border-slate-200 px-2 py-1 text-sm"
                      />
                    ) : (
                      row.tipeSupplier || "—"
                    )}
                  </td>
                  <td className="px-3 py-2 font-medium">
                    {editing ? (
                      <input
                        value={editForm.kode}
                        disabled={!isSuperAdmin}
                        onChange={(e) => setEditForm((f) => ({ ...f, kode: e.target.value }))}
                        className="w-full rounded border border-slate-200 px-2 py-1 text-sm disabled:bg-slate-100"
                        title={isSuperAdmin ? undefined : "Hanya Super Admin bisa ubah kode"}
                      />
                    ) : (
                      row.kode
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {editing ? (
                      <input
                        value={editForm.namaSupplier}
                        onChange={(e) => setEditForm((f) => ({ ...f, namaSupplier: e.target.value }))}
                        className="w-full rounded border border-slate-200 px-2 py-1 text-sm"
                      />
                    ) : (
                      row.namaSupplier
                    )}
                  </td>
                  {canEdit ? (
                    <td className="px-3 py-2">
                      {editing ? (
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            disabled={saving}
                            onClick={() => void saveEdit()}
                            className="text-xs font-medium text-blue-600 hover:underline disabled:opacity-50"
                          >
                            Simpan
                          </button>
                          <button
                            type="button"
                            onClick={cancelEdit}
                            className="text-xs text-slate-500 hover:underline"
                          >
                            Batal
                          </button>
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => startEdit(row)}
                            className="text-xs font-medium text-blue-600 hover:underline"
                          >
                            Ubah
                          </button>
                          <button
                            type="button"
                            disabled={saving}
                            onClick={() => void onDelete(row.sheetRow)}
                            className="text-xs font-medium text-red-600 hover:underline disabled:opacity-50"
                          >
                            Hapus
                          </button>
                        </div>
                      )}
                    </td>
                  ) : null}
                </tr>
              );
            })}
            {!loading && rows.length === 0 ? (
              <tr>
                <td colSpan={canEdit ? 4 : 3} className="px-4 py-8 text-center text-slate-500">
                  Belum ada data — upload tanpa mapping tetap jalan (format folder lama).
                </td>
              </tr>
            ) : null}
            {!loading && rows.length > 0 && displayRows.length === 0 ? (
              <tr>
                <td colSpan={canEdit ? 4 : 3} className="px-4 py-8 text-center text-slate-500">
                  Tidak ada baris yang cocok dengan filter / pencarian.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </section>
    </div>
  );
}
