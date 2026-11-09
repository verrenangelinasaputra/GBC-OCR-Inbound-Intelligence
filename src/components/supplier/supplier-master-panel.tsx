"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Save } from "lucide-react";

type SupplierRow = {
  username: string;
  supplierName: string;
  contactName: string;
  email: string;
  status: string;
  drive: {
    driveRootFolderUrl: string;
    driveRootFolderId: string;
    mirrorEnabled: boolean;
    pathLocked: boolean;
  } | null;
};

type Draft = {
  folderUrl: string;
  mirrorEnabled: boolean;
  pathLocked: boolean;
};

export function SupplierMasterPanel() {
  const [rows, setRows] = useState<SupplierRow[]>([]);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/supplier/master/suppliers");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Gagal memuat daftar supplier");
      const suppliers = (json.suppliers ?? []) as SupplierRow[];
      setRows(suppliers);
      const next: Record<string, Draft> = {};
      for (const s of suppliers) {
        next[s.username] = {
          folderUrl: s.drive?.driveRootFolderUrl || "",
          mirrorEnabled: s.drive?.mirrorEnabled ?? false,
          pathLocked: s.drive?.pathLocked ?? true,
        };
      }
      setDrafts(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal memuat");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function save(username: string) {
    const draft = drafts[username];
    if (!draft) return;
    setSaving(username);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch(`/api/supplier/master/suppliers/${encodeURIComponent(username)}/drive`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          driveRootFolderUrl: draft.folderUrl,
          mirrorEnabled: draft.mirrorEnabled,
          pathLocked: draft.pathLocked,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Simpan gagal");
      setMessage(`Pengaturan Drive untuk @${username} tersimpan.`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Simpan gagal");
    } finally {
      setSaving(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-slate-600">
        <Loader2 className="animate-spin" size={18} />
        Memuat daftar supplier…
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-600">
        <p className="font-medium text-slate-900">Mirror ke Drive supplier</p>
        <p className="mt-1">
          Setiap submit mengunggah ke folder GBC (Nomar) seperti biasa, lalu menyalin struktur yang sama ke folder
          root supplier jika <strong>Mirror aktif</strong>. Folder supplier harus dishare sebagai{" "}
          <strong>Editor</strong> ke akun OAuth Drive (mis. nomarcengkareng@gmail.com).
        </p>
      </div>

      {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {message && <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{message}</p>}

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
            <tr>
              <th className="px-3 py-2 font-medium">Supplier</th>
              <th className="px-3 py-2 font-medium">Username</th>
              <th className="px-3 py-2 font-medium">Status</th>
              <th className="px-3 py-2 font-medium min-w-[280px]">Folder Drive (URL / path)</th>
              <th className="px-3 py-2 font-medium">Mirror</th>
              <th className="px-3 py-2 font-medium">Lock path</th>
              <th className="px-3 py-2 font-medium" />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-3 py-6 text-center text-slate-500">
                  Belum ada supplier terdaftar.
                </td>
              </tr>
            ) : (
              rows.map((row) => {
                const draft = drafts[row.username];
                if (!draft) return null;
                return (
                  <tr key={row.username} className="border-b border-slate-100 align-top">
                    <td className="px-3 py-3">
                      <p className="font-medium text-slate-900">{row.supplierName}</p>
                      <p className="text-xs text-slate-500">{row.contactName}</p>
                    </td>
                    <td className="px-3 py-3 font-mono text-xs">{row.username}</td>
                    <td className="px-3 py-3">
                      <span
                        className={
                          row.status === "ACTIVE"
                            ? "rounded bg-emerald-100 px-2 py-0.5 text-xs text-emerald-800"
                            : "rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-600"
                        }
                      >
                        {row.status}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <input
                        type="url"
                        value={draft.folderUrl}
                        onChange={(e) =>
                          setDrafts((d) => ({
                            ...d,
                            [row.username]: { ...draft, folderUrl: e.target.value },
                          }))
                        }
                        placeholder="https://drive.google.com/drive/folders/..."
                        className="w-full rounded border border-slate-200 px-2 py-1.5 text-xs"
                      />
                    </td>
                    <td className="px-3 py-3">
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={draft.mirrorEnabled}
                          onChange={(e) =>
                            setDrafts((d) => ({
                              ...d,
                              [row.username]: { ...draft, mirrorEnabled: e.target.checked },
                            }))
                          }
                        />
                        <span className="text-xs">Aktif</span>
                      </label>
                    </td>
                    <td className="px-3 py-3">
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={draft.pathLocked}
                          onChange={(e) =>
                            setDrafts((d) => ({
                              ...d,
                              [row.username]: { ...draft, pathLocked: e.target.checked },
                            }))
                          }
                        />
                        <span className="text-xs">Lock</span>
                      </label>
                    </td>
                    <td className="px-3 py-3">
                      <button
                        type="button"
                        disabled={saving === row.username}
                        onClick={() => void save(row.username)}
                        className="inline-flex items-center gap-1 rounded-md bg-blue-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-60"
                      >
                        {saving === row.username ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <Save size={14} />
                        )}
                        Simpan
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
