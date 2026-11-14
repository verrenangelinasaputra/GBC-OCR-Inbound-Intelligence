"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  SkuMasterRekapSkulRow,
  SkuMasterRekapSkusRow,
  SkuMasterTableRow,
} from "@/lib/sku-master/types";
import { SKU_SUB_SHORT_LABELS } from "@/lib/sku-master/sub-labels";
import { SkuMasterRowEditDialog } from "@/components/master-mapping/sku-master-row-edit-dialog";

type ListTabId = string;

export function SkuMasterListTabs({
  generatorTabs,
  refreshKey = 0,
  canEdit = false,
  onRowEdited,
}: {
  generatorTabs: string[];
  refreshKey?: number;
  canEdit?: boolean;
  onRowEdited?: () => void;
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
  const [editRow, setEditRow] = useState<SkuMasterTableRow | null>(null);
  const [deletingKey, setDeletingKey] = useState<string | null>(null);

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

  async function onDeleteRow(row: SkuMasterTableRow) {
    if (!canEdit) return;
    const label = row.namaProdukAcuan || row.skuLengkap || `baris ${row.sheetRow}`;
    const ok = window.confirm(
      `Hapus "${label}" dari tab ${row.categoryTab}?\n\nBaris TABEL, entri REKAP SKUL terkait, dan hitungan REKAP SKUS akan disesuaikan.`
    );
    if (!ok) return;

    const key = `${row.categoryTab}-${row.sheetRow}`;
    setDeletingKey(key);
    setError(null);
    try {
      const qs = new URLSearchParams({
        tab: row.categoryTab,
        sheetRow: String(row.sheetRow),
        skuLengkap: row.skuLengkap || "",
      });
      const res = await fetch(`/api/sku-master/products?${qs.toString()}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menghapus");
      await loadActive(true);
      onRowEdited?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal menghapus");
    } finally {
      setDeletingKey(null);
    }
  }

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
          <CategoryTable
            rows={tableRows}
            canEdit={canEdit}
            deletingKey={deletingKey}
            onEdit={setEditRow}
            onDelete={onDeleteRow}
          />
        )}
      </div>

      {editRow ? (
        <SkuMasterRowEditDialog
          row={editRow}
          onClose={() => setEditRow(null)}
          onSaved={() => {
            void loadActive(true);
            onRowEdited?.();
          }}
        />
      ) : null}
    </section>
  );
}

function SubCell({ value }: { value: string }) {
  return <td className="whitespace-nowrap px-1.5 py-2 font-mono text-[10px]">{value || "—"}</td>;
}

function CategoryTable({
  rows,
  canEdit,
  deletingKey,
  onEdit,
  onDelete,
}: {
  rows: SkuMasterTableRow[];
  canEdit: boolean;
  deletingKey: string | null;
  onEdit: (row: SkuMasterTableRow) => void;
  onDelete: (row: SkuMasterTableRow) => void;
}) {
  if (rows.length === 0) {
    return (
      <p className="px-4 py-8 text-center text-sm text-slate-500">
        Belum ada baris di TABEL 1. Klik Sync atau tambah produk baru.
      </p>
    );
  }
  return (
    <table className="min-w-[1400px] w-full text-left text-xs">
      <thead className="bg-slate-50 text-slate-600">
        <tr>
          <th className="sticky left-0 z-10 bg-slate-50 px-2 py-2">Aksi</th>
          <th className="px-2 py-2">No</th>
          <th className="min-w-[140px] px-2 py-2">Nama produk acuan</th>
          <th className="min-w-[120px] px-2 py-2">Internal</th>
          {SKU_SUB_SHORT_LABELS.map((h) => (
            <th key={h} className="px-1.5 py-2 font-mono text-[10px]">
              {h}
            </th>
          ))}
          <th className="px-2 py-2">SKU lengkap</th>
          <th className="px-2 py-2">SKUS</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100">
        {rows.map((r, index) => {
          const rowKey = `${r.categoryTab}-${r.sheetRow}`;
          const isDeleting = deletingKey === rowKey;
          return (
          <tr key={rowKey} className="text-slate-800">
            <td className="sticky left-0 z-10 bg-white px-2 py-2">
              {canEdit ? (
                <div className="flex flex-wrap gap-1">
                  <button
                    type="button"
                    onClick={() => onEdit(r)}
                    disabled={isDeleting}
                    className="rounded border border-slate-200 px-2 py-1 text-[11px] font-medium text-blue-700 hover:bg-blue-50 disabled:opacity-50"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => void onDelete(r)}
                    disabled={isDeleting}
                    className="rounded border border-red-200 px-2 py-1 text-[11px] font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
                  >
                    {isDeleting ? "…" : "Hapus"}
                  </button>
                </div>
              ) : (
                <span className="text-slate-400">—</span>
              )}
            </td>
            <td className="px-2 py-2 tabular-nums">{index + 1}</td>
            <td className="px-2 py-2 font-medium">{r.namaProdukAcuan}</td>
            <td className="px-2 py-2">{r.namaInternalAccurate}</td>
            <SubCell value={r.sub1} />
            <SubCell value={r.sub2} />
            <SubCell value={r.sub3} />
            <SubCell value={r.sub4} />
            <SubCell value={r.sub5} />
            <SubCell value={r.sub6} />
            <SubCell value={r.sub7} />
            <SubCell value={r.sub8} />
            <SubCell value={r.sub9} />
            <td className="px-2 py-2 font-mono text-[10px]">{r.skuLengkap || "—"}</td>
            <td className="px-2 py-2 font-mono text-[10px]">{r.skus || "—"}</td>
          </tr>
          );
        })}
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
        {rows.map((r, index) => (
          <tr key={`${r.rowNo}-${r.skuLengkap}`}>
            <td className="px-2 py-2 tabular-nums">{index + 1}</td>
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
        {rows.map((r, index) => (
          <tr key={`${r.rowNo}-${r.skus}`}>
            <td className="px-2 py-2 tabular-nums">{index + 1}</td>
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