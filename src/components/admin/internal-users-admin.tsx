"use client";

import { useCallback, useEffect, useState } from "react";
import type { AppModule } from "@/lib/rbac/modules";
import { ASSIGNABLE_NAV_MODULES } from "@/lib/rbac/nav-modules";
import { SUPPLIER_GUDANG_OPTIONS } from "@/lib/config/supplier-gudang";
import { StatusBadge } from "@/components/ui/status-badge";

type AdminUser = {
  username: string;
  fullName: string;
  email: string;
  phone: string;
  gudang: string;
  roles: string[];
  status: string;
  allowedModules: AppModule[];
  createdAt: string;
};

function parseGudangList(gudang: string): string[] {
  return gudang
    .split(/[;|]/)
    .map((g) => g.trim())
    .filter(Boolean);
}

export function InternalUsersAdmin() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [draftGudang, setDraftGudang] = useState<string[]>([]);
  const [draftModules, setDraftModules] = useState<AppModule[]>([]);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/internal-users");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal memuat");
      setUsers(data.users ?? []);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Gagal memuat");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function startEdit(u: AdminUser) {
    setEditing(u.username);
    setDraftGudang(parseGudangList(u.gudang));
    setDraftModules(u.allowedModules.length ? [...u.allowedModules] : []);
    setMessage(null);
  }

  async function patchUser(username: string, body: Record<string, unknown>) {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/internal-users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, ...body }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal simpan");
      setMessage("Perubahan tersimpan.");
      setEditing(null);
      await load();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Gagal simpan");
    } finally {
      setSaving(false);
    }
  }

  const pending = users.filter((u) => u.status === "PENDING_APPROVAL");
  const others = users.filter((u) => u.status !== "PENDING_APPROVAL");

  if (loading) {
    return <p className="text-sm text-slate-500">Memuat daftar user…</p>;
  }

  return (
    <div className="space-y-8">
      {message ? (
        <p className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-800">{message}</p>
      ) : null}

      {pending.length > 0 ? (
        <section>
          <h2 className="text-base font-semibold text-amber-900">Menunggu persetujuan ({pending.length})</h2>
          <ul className="mt-3 space-y-3">
            {pending.map((u) => (
              <li key={u.username} className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 text-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-slate-900">
                      {u.fullName} <span className="text-slate-500">@{u.username}</span>
                    </p>
                    <p className="text-slate-600">{u.email} · {u.phone}</p>
                    <p className="text-slate-600">Gudang (daftar): {u.gudang || "—"}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={saving}
                      className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                      onClick={() => void patchUser(u.username, { status: "ACTIVE" })}
                    >
                      Setujui
                    </button>
                    <button
                      type="button"
                      disabled={saving}
                      className="rounded-lg border border-red-300 bg-white px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
                      onClick={() => void patchUser(u.username, { status: "REJECTED" })}
                    >
                      Tolak
                    </button>
                    <button
                      type="button"
                      className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50"
                      onClick={() => startEdit(u)}
                    >
                      Atur gudang & halaman
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section>
        <h2 className="text-base font-semibold text-slate-900">Semua akun internal</h2>
        <div className="mt-3 overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-600">
              <tr>
                <th className="px-3 py-2">User</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Gudang</th>
                <th className="px-3 py-2">Halaman</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {[...pending, ...others].map((u) => (
                <tr key={u.username}>
                  <td className="px-3 py-2">
                    <p className="font-medium">{u.fullName}</p>
                    <p className="text-xs text-slate-500">@{u.username}</p>
                  </td>
                  <td className="px-3 py-2">
                    <StatusBadge
                      label={u.status.replace(/_/g, " ")}
                      tone={
                        u.status === "ACTIVE"
                          ? "success"
                          : u.status === "PENDING_APPROVAL"
                            ? "warning"
                            : "danger"
                      }
                    />
                  </td>
                  <td className="px-3 py-2 text-xs">{u.gudang || "—"}</td>
                  <td className="px-3 py-2 text-xs text-slate-600">
                    {u.allowedModules.length
                      ? `${u.allowedModules.length} halaman`
                      : "Ikut role (belum diatur)"}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button
                      type="button"
                      className="text-blue-600 hover:underline"
                      onClick={() => startEdit(u)}
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {editing ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-5 shadow-lg">
            <h3 className="text-lg font-medium">Atur: @{editing}</h3>
            <p className="mt-1 text-xs text-slate-500">
              Centang halaman yang boleh dibuka user (Opsi B). Gudang mempengaruhi filter data OCR/SKU.
            </p>

            <fieldset className="mt-4">
              <legend className="text-sm font-medium text-slate-800">Gudang</legend>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {SUPPLIER_GUDANG_OPTIONS.map((g) => (
                  <label key={g} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={draftGudang.includes(g)}
                      onChange={(e) => {
                        setDraftGudang((prev) =>
                          e.target.checked ? [...prev, g] : prev.filter((x) => x !== g)
                        );
                      }}
                    />
                    {g}
                  </label>
                ))}
              </div>
            </fieldset>

            <fieldset className="mt-4">
              <legend className="text-sm font-medium text-slate-800">Halaman yang boleh diakses</legend>
              <div className="mt-2 max-h-48 space-y-2 overflow-y-auto">
                {ASSIGNABLE_NAV_MODULES.map((m) => (
                  <label key={m.module} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={draftModules.includes(m.module)}
                      onChange={(e) => {
                        setDraftModules((prev) =>
                          e.target.checked
                            ? [...prev, m.module]
                            : prev.filter((x) => x !== m.module)
                        );
                      }}
                    />
                    {m.label}
                  </label>
                ))}
              </div>
            </fieldset>

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
                disabled={saving || !draftGudang.length}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                onClick={() =>
                  void patchUser(editing, {
                    gudang: draftGudang,
                    allowedModules: draftModules,
                    status: "ACTIVE",
                  })
                }
              >
                {saving ? "Menyimpan…" : "Simpan & aktifkan"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
