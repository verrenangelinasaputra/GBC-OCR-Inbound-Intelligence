"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { StatusBadge } from "@/components/ui/status-badge";

type ReviewRow = {
  username: string;
  supplierName: string;
  accountStatus: string;
  mappingStatus: "matched" | "unmatched";
  kode?: string;
  matchedAlias?: string;
};

export function SupplierAccountsMappingTab() {
  const [rows, setRows] = useState<ReviewRow[]>([]);
  const [summary, setSummary] = useState({ total: 0, matched: 0, unmatched: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "matched" | "unmatched">("all");

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
      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-800">{error}</p>
      ) : null}

      <p className="text-sm text-slate-600">
        Daftar dari sheet <strong>Supplier Credentials</strong>. Kode &amp; alias dicek terhadap{" "}
        <Link href="/supplier-data-mapping" className="font-medium text-blue-600 hover:underline">
          Mapping Data Supplier
        </Link>
        . Jika nama perusahaan / username belum cocok, tambahkan baris alias di sana (Opsi A: kode sama, nama beda).
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
              <th className="px-3 py-2" />
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
                <td className="px-3 py-2 text-right">
                  {r.mappingStatus === "unmatched" ? (
                    <Link
                      href={`/supplier-data-mapping?nama=${encodeURIComponent(r.supplierName || r.username)}`}
                      className="text-blue-600 hover:underline"
                    >
                      Tambah mapping
                    </Link>
                  ) : (
                    <Link href="/supplier-data-mapping" className="text-slate-500 hover:underline">
                      Lihat sheet
                    </Link>
                  )}
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
    </div>
  );
}
