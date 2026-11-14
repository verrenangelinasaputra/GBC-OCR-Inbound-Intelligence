"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { StatusBadge } from "@/components/ui/status-badge";

type ReviewRow = {
  username: string;
  supplierName: string;
  contactName: string;
  email: string;
  phone: string;
  accountStatus: string;
  mappingStatus: "matched" | "unmatched";
  kode?: string;
  matchedAlias?: string;
};

const STATUS_OPTIONS = ["ACTIVE", "DISABLED"] as const;

export function SupplierAccountsMappingTab() {
  const [rows, setRows] = useState<ReviewRow[]>([]);
  const [summary, setSummary] = useState({ total: 0, matched: 0, unmatched: 0 });
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "matched" | "unmatched">("all");
  const [editing, setEditing] = useState<ReviewRow | null>(null);
  const [draft, setDraft] = useState({
    supplierName: "",
    contactName: "",
    email: "",
    phone: "",
    status: "ACTIVE",
  });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/supplier-mapping-review");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal memuat");
      setRows(data.rows ?? []);
      setSummary(data.summary ?? { total: 0, matched: 0, unmatched: 0 });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal memuat");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function startEdit(row: ReviewRow) {
    setEditing(row);
    setDraft({
      supplierName: row.supplierName,
      contactName: row.contactName,
      email: row.email,
      phone: row.phone,
      status: row.accountStatus === "DISABLED" ? "DISABLED" : "ACTIVE",
    });
    setMessage(null);
    setError(null);
  }

  async function saveEdit() {
    if (!editing) return;
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch("/api/admin/supplier-accounts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: editing.username, ...draft }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal simpan");
      setMessage(`Akun @${editing.username} diperbarui.`);
      setEditing(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal simpan");
    } finally {
      setSaving(false);
    }
  }

  async function deleteAccount(row: ReviewRow) {
    if (
      !window.confirm(
        `Hapus akun supplier ${row.supplierName} (@${row.username}) dari spreadsheet? Username bisa dipakai daftar ulang.`
      )
    ) {
      return;
    }
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch("/api/admin/supplier-accounts", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: row.username }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal hapus");
      if (editing?.username === row.username) setEditing(null);
      setMessage(`Akun @${row.username} dihapus.`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal hapus");
    } finally {
      setSaving(false);
    }
  }

  const visible = rows.filter((r) => {
    if (filter === "matched") return r.mappingStatus === "matched";
    if (filter === "unmatched") return r.mappingStatus === "unmatched";
    return true;
  });

  if (loading) {
    return <p className="text-sm text-slate-500">Memuat akun supplier…</p>;
  }

  return (
    <div className="space-y-4">
      {message ? (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-900">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-800">{error}</p>
      ) : null}

      <p className="text-sm text-slate-600">
        Super Admin bisa <strong>edit / hapus</strong> akun di sheet Supplier Credentials. Kode &amp; alias dicek
        terhadap{" "}
        <Link href="/supplier-data-mapping" className="font-medium text-blue-600 hover:underline">
          Mapping Data Supplier
        </Link>
        .
      </p>

      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-slate-600">
          {summary.matched} cocok · {summary.unmatched} belum cocok · {summary.total} akun
        </span>
        <span className="text-slate-300">|</span>
        {(
          [
            ["all", "Semua"],
            ["matched", "Sudah cocok"],
            ["unmatched", "Belum cocok"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setFilter(key)}
            className={
              filter === key
                ? "rounded-full bg-slate-900 px-3 py-1 text-white"
                : "rounded-full border border-slate-200 bg-white px-3 py-1 text-slate-700 hover:bg-slate-50"
            }
          >
            {label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => void load()}
          className="ml-auto text-blue-600 hover:underline"
        >
          Refresh
        </button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-600">
            <tr>
              <th className="px-3 py-2">Supplier</th>
              <th className="px-3 py-2">Username</th>
              <th className="px-3 py-2">Status akun</th>
              <th className="px-3 py-2">Kode</th>
              <th className="px-3 py-2">Cocok mapping?</th>
              <th className="px-3 py-2">Alias di sheet</th>
              <th className="px-3 py-2 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {visible.map((r) => (
              <tr key={r.username}>
                <td className="px-3 py-2 font-medium">{r.supplierName || "—"}</td>
                <td className="px-3 py-2 text-slate-600">@{r.username}</td>
                <td className="px-3 py-2">
                  <StatusBadge
                    label={r.accountStatus.replace(/_/g, " ")}
                    tone={
                      r.accountStatus === "ACTIVE"
                        ? "success"
                        : r.accountStatus === "PENDING_APPROVAL"
                          ? "warning"
                          : "default"
                    }
                  />
                </td>
                <td className="px-3 py-2 font-mono text-xs">{r.kode ?? "—"}</td>
                <td className="px-3 py-2">
                  {r.mappingStatus === "matched" ? (
                    <StatusBadge label="Cocok" tone="success" />
                  ) : (
                    <StatusBadge label="Belum cocok" tone="warning" />
                  )}
                </td>
                <td className="px-3 py-2 text-xs text-slate-600">{r.matchedAlias ?? "—"}</td>
                <td className="px-3 py-2">
                  <div className="flex flex-wrap items-center justify-end gap-2 text-xs">
                    <button
                      type="button"
                      className="text-blue-600 hover:underline"
                      onClick={() => startEdit(r)}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      disabled={saving}
                      className="text-red-600 hover:underline disabled:opacity-50"
                      onClick={() => void deleteAccount(r)}
                    >
                      Hapus
                    </button>
                    {r.mappingStatus === "unmatched" ? (
                      <Link
                        href={`/supplier-data-mapping?nama=${encodeURIComponent(r.supplierName || r.username)}`}
                        className="text-blue-600 hover:underline"
                      >
                        Tambah mapping
                      </Link>
                    ) : (
                      <Link href="/supplier-data-mapping" className="text-slate-500 hover:underline">
                        Mapping
                      </Link>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {visible.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                  Tidak ada baris untuk filter ini.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {editing ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-5 shadow-lg">
            <h3 className="text-lg font-medium">Edit supplier @{editing.username}</h3>
            <p className="mt-1 text-xs text-slate-500">Username tidak bisa diubah — hapus &amp; daftar ulang jika perlu.</p>
            <div className="mt-4 grid gap-3">
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-slate-600">Nama perusahaan</span>
                <input
                  className="rounded-lg border border-slate-200 px-3 py-2"
                  value={draft.supplierName}
                  onChange={(e) => setDraft((d) => ({ ...d, supplierName: e.target.value }))}
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-slate-600">Nama kontak</span>
                <input
                  className="rounded-lg border border-slate-200 px-3 py-2"
                  value={draft.contactName}
                  onChange={(e) => setDraft((d) => ({ ...d, contactName: e.target.value }))}
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-slate-600">Email</span>
                <input
                  type="email"
                  className="rounded-lg border border-slate-200 px-3 py-2"
                  value={draft.email}
                  onChange={(e) => setDraft((d) => ({ ...d, email: e.target.value }))}
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-slate-600">Telepon</span>
                <input
                  className="rounded-lg border border-slate-200 px-3 py-2"
                  value={draft.phone}
                  onChange={(e) => setDraft((d) => ({ ...d, phone: e.target.value }))}
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-slate-600">Status akun</span>
                <select
                  className="rounded-lg border border-slate-200 px-3 py-2"
                  value={draft.status}
                  onChange={(e) => setDraft((d) => ({ ...d, status: e.target.value }))}
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm"
                onClick={() => setEditing(null)}
                disabled={saving}
              >
                Batal
              </button>
              <button
                type="button"
                disabled={saving}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                onClick={() => void saveEdit()}
              >
                {saving ? "Menyimpan…" : "Simpan"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
