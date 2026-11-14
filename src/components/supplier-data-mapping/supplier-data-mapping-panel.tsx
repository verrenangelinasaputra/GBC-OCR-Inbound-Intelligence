"use client";

import { useCallback, useEffect, useState } from "react";
import type { SupplierMasterDataRow } from "@/lib/supplier-mapping/types";

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
        <h2 className="border-b border-slate-100 px-4 py-3 text-sm font-semibold text-slate-800">
          Daftar mapping {loading ? "…" : `(${rows.length})`}
        </h2>
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-600">
            <tr>
              <th className="px-3 py-2">Tipe</th>
              <th className="px-3 py-2">Kode</th>
              <th className="px-3 py-2">Nama Supplier</th>
              {canEdit ? <th className="px-3 py-2 w-40">Aksi</th> : null}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row) => {
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
          </tbody>
        </table>
      </section>
    </div>
  );
}
