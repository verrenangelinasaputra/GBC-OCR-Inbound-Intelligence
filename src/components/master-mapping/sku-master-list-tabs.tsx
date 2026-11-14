"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  SkuMasterRekapSkulRow,
  SkuMasterRekapSkusRow,
  SkuMasterTableRow,
} from "@/lib/sku-master/types";

type ListTabId = string;

export function SkuMasterListTabs({
  generatorTabs,
  refreshKey = 0,
}: {
  generatorTabs: string[];
  /** Naikkan setelah sync / simpan produk agar tab aktif dimuat ulang */
  refreshKey?: number;
}) {
  const listTabs = useMemo(
    (): ListTabId[] => [...generatorTabs, "REKAP SKUL", "REKAP SKUS"],
    [generatorTabs]
  );
  const [active, setActive] = useState<ListTabId>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tableRows, setTableRows] = useState<SkuMasterTableRow[]>([]);
  const [rekapSkulRows, setRekapSkulRows] = useState<SkuMasterRekapSkulRow[]>([]);
  const [rekapSkusRows, setRekapSkusRows] = useState<SkuMasterRekapSkusRow[]>([]);

  useEffect(() => {
    if (!active && listTabs.length > 0) setActive(listTabs[0]!);
  }, [active, listTabs]);

  const loadActive = useCallback(async (forceRefresh: boolean) => {
    if (!active) return;
    setLoading(true);
    setError(null);
    try {
      const refresh = forceRefresh ? "&refresh=1" : "";
      let url: string;
      if (active === "REKAP SKUL") {
        url = `/api/sku-master/list?view=rekap-skul${refresh}`;
      } else if (active === "REKAP SKUS") {
        url = `/api/sku-master/list?view=rekap-skus${refresh}`;
      } else {
        url = `/api/sku-master/list?view=table&tab=${encodeURIComponent(active)}${refresh}`;
      }
      const res = await fetch(url);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal memuat daftar");

      if (active === "REKAP SKUL") {
        setRekapSkulRows(data.rows ?? []);
      } else if (active === "REKAP SKUS") {
        setRekapSkusRows(data.rows ?? []);
      } else {
        setTableRows(data.rows ?? []);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal memuat daftar");
    } finally {
      setLoading(false);
    }
  }, [active]);

  useEffect(() => {
    void loadActive(false);
  }, [loadActive]);

  useEffect(() => {
    if (refreshKey > 0) void loadActive(true);
  }, [refreshKey, loadActive]);

  return (
    <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-3 py-2">
        <h2 className="px-1 py-1 text-sm font-semibold text-slate-900">Daftar data (TABEL &amp; REKAP)</h2>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {listTabs.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActive(tab)}
              className={`rounded-md px-2.5 py-1 text-xs font-medium ${
                active === tab ? "bg-slate-800 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {error ? (
        <p className="border-b border-red-100 bg-red-50 px-4 py-2 text-sm text-red-800">{error}</p>
      ) : null}

      <div className="overflow-x-auto">
        {loading ? (
          <p className="px-4 py-8 text-center text-sm text-slate-500">Memuat {active}…</p>
        ) : active === "REKAP SKUL" ? (
          <RekapSkulTable rows={rekapSkulRows} />
        ) : active === "REKAP SKUS" ? (
          <RekapSkusTable rows={rekapSkusRows} />
        ) : (
          <CategoryTable rows={tableRows} />
        )}
      </div>
    </section>
  );
}

function CategoryTable({ rows }: { rows: SkuMasterTableRow[] }) {
  if (rows.length === 0) {
    return (
      <p className="px-4 py-8 text-center text-sm text-slate-500">
        Belum ada baris di TABEL 1. Klik Sync atau tambah produk baru.
      </p>
    );
  }
  return (
    <table className="min-w-[960px] w-full text-left text-xs">
      <thead className="bg-slate-50 text-slate-600">
        <tr>
          <th className="px-2 py-2">No</th>
          <th className="px-2 py-2">Nama produk acuan</th>
          <th className="px-2 py-2">Internal Accurate</th>
          <th className="px-2 py-2">Sub 1–6</th>
          <th className="px-2 py-2">Sub 7–9</th>
          <th className="px-2 py-2">SKU lengkap</th>
          <th className="px-2 py-2">SKUS</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100">
        {rows.map((r) => (
          <tr key={`${r.categoryTab}-${r.sheetRow}`} className="text-slate-800">
            <td className="px-2 py-2">{r.no || r.sheetRow}</td>
            <td className="max-w-[200px] px-2 py-2 font-medium">{r.namaProdukAcuan}</td>
            <td className="max-w-[180px] px-2 py-2">{r.namaInternalAccurate}</td>
            <td className="px-2 py-2 font-mono text-[10px]">
              {[r.sub1, r.sub2, r.sub3, r.sub4, r.sub5, r.sub6].filter(Boolean).join(" · ") || "—"}
            </td>
            <td className="px-2 py-2 font-mono text-[10px]">
              {[r.sub7, r.sub8, r.sub9].filter(Boolean).join(" · ") || "—"}
            </td>
            <td className="px-2 py-2 font-mono">{r.skuLengkap || "—"}</td>
            <td className="px-2 py-2 font-mono">{r.skus || "—"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function RekapSkulTable({ rows }: { rows: SkuMasterRekapSkulRow[] }) {
  if (rows.length === 0) {
    return <p className="px-4 py-8 text-center text-sm text-slate-500">REKAP SKUL kosong.</p>;
  }
  return (
    <table className="min-w-full text-left text-xs">
      <thead className="bg-slate-50 text-slate-600">
        <tr>
          <th className="px-2 py-2">No</th>
          <th className="px-2 py-2">SKU lengkap</th>
          <th className="px-2 py-2">Produk acuan</th>
          <th className="px-2 py-2">SKUS</th>
          <th className="px-2 py-2">Sumber</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100">
        {rows.map((r) => (
          <tr key={`${r.rowNo}-${r.skuLengkap}`}>
            <td className="px-2 py-2">{r.rowNo}</td>
            <td className="px-2 py-2 font-mono">{r.skuLengkap}</td>
            <td className="px-2 py-2">{r.namaProdukAcuan}</td>
            <td className="px-2 py-2 font-mono">{r.skus}</td>
            <td className="px-2 py-2">{r.sumberLembar}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function RekapSkusTable({ rows }: { rows: SkuMasterRekapSkusRow[] }) {
  if (rows.length === 0) {
    return <p className="px-4 py-8 text-center text-sm text-slate-500">REKAP SKUS kosong.</p>;
  }
  return (
    <table className="min-w-full text-left text-xs">
      <thead className="bg-slate-50 text-slate-600">
        <tr>
          <th className="px-2 py-2">No</th>
          <th className="px-2 py-2">SKUS</th>
          <th className="px-2 py-2">Nama internal</th>
          <th className="px-2 py-2">Jumlah varian</th>
          <th className="px-2 py-2">Sumber</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100">
        {rows.map((r) => (
          <tr key={`${r.rowNo}-${r.skus}`}>
            <td className="px-2 py-2">{r.rowNo}</td>
            <td className="px-2 py-2 font-mono">{r.skus}</td>
            <td className="px-2 py-2">{r.namaInternal}</td>
            <td className="px-2 py-2 text-center">{r.variantCount}</td>
            <td className="px-2 py-2">{r.sourceTab}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}