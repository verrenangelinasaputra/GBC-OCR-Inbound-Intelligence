"use client";

import { useEffect, useState } from "react";
import type { SkuMasterCodeOption, SkuMasterTableRow } from "@/lib/sku-master/types";
import { resolveSub1ForCategoryTab } from "@/lib/sku-master/sub1-for-tab";
import { SKU_SUB_LABELS } from "@/lib/sku-master/sub-labels";

const SUB_KEYS = ["sub1", "sub2", "sub3", "sub4", "sub5", "sub6", "sub7", "sub8", "sub9"] as const;

type SubKey = (typeof SUB_KEYS)[number];

export function SkuMasterRowEditDialog({
  row,
  onClose,
  onSaved,
}: {
  row: SkuMasterTableRow;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [namaProdukAcuan, setNamaProdukAcuan] = useState(row.namaProdukAcuan);
  const [namaInternalAccurate, setNamaInternalAccurate] = useState(row.namaInternalAccurate);
  const [subs, setSubs] = useState<Record<SubKey, string>>({
    sub1: row.sub1,
    sub2: row.sub2,
    sub3: row.sub3,
    sub4: row.sub4,
    sub5: row.sub5,
    sub6: row.sub6,
    sub7: row.sub7,
    sub8: row.sub8,
    sub9: row.sub9,
  });
  const [codeOptions, setCodeOptions] = useState<Record<number, SkuMasterCodeOption[]>>({});
  const [loadingCodes, setLoadingCodes] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingCodes(true);
      try {
        const res = await fetch(
          `/api/sku-master/codes?tab=${encodeURIComponent(row.categoryTab)}&all=1`
        );
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Gagal memuat kode");
        if (!cancelled) {
          setCodeOptions((data.bySub as Record<number, SkuMasterCodeOption[]>) ?? {});
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Gagal memuat kode");
      } finally {
        if (!cancelled) setLoadingCodes(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [row.categoryTab]);

  useEffect(() => {
    const sub1 = resolveSub1ForCategoryTab(row.categoryTab, codeOptions[1] ?? []);
    setSubs((s) => ({ ...s, sub1 }));
  }, [row.categoryTab, codeOptions]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/sku-master/products", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categoryTab: row.categoryTab,
          sheetRow: row.sheetRow,
          oldSkuLengkap: row.skuLengkap,
          namaProdukAcuan,
          namaInternalAccurate,
          ...subs,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal simpan");
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal simpan");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div
        role="dialog"
        aria-labelledby="edit-sku-row-title"
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-slate-200 bg-white p-5 shadow-xl"
      >
        <div className="mb-4 flex items-start justify-between gap-2">
          <div>
            <h3 id="edit-sku-row-title" className="text-base font-semibold text-slate-900">
              Edit baris TABEL — {row.categoryTab} (baris {row.sheetRow})
            </h3>
            <p className="text-xs text-slate-500">SKU sekarang: {row.skuLengkap || "—"}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-200 px-2 py-1 text-sm text-slate-600 hover:bg-slate-50"
          >
            Tutup
          </button>
        </div>

        {error ? (
          <p className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            {error}
          </p>
        ) : null}

        <form onSubmit={(e) => void onSubmit(e)} className="space-y-4">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-slate-600">Nama produk acuan</span>
            <input
              required
              value={namaProdukAcuan}
              onChange={(e) => setNamaProdukAcuan(e.target.value)}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-slate-600">Nama internal Accurate</span>
            <input
              required
              value={namaInternalAccurate}
              onChange={(e) => setNamaInternalAccurate(e.target.value)}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </label>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {SUB_KEYS.map((key, idx) => {
              const subIndex = idx + 1;
              const options = codeOptions[subIndex] ?? [];
              const label = SKU_SUB_LABELS[idx] ?? `Sub ${subIndex}`;
              if (subIndex === 1) {
                const sub1Value = subs.sub1;
                const sub1Label = options.find((o) => o.code === sub1Value)?.label ?? sub1Value;
                return (
                  <label key={key} className="flex flex-col gap-1">
                    <span className="text-xs font-medium text-slate-600">{label}</span>
                    <div className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-2 text-sm">
                      {sub1Value} — {sub1Label}
                    </div>
                  </label>
                );
              }
              return (
                <label key={key} className="flex flex-col gap-1">
                  <span className="text-xs font-medium text-slate-600">{label}</span>
                  <select
                    value={subs[key]}
                    onChange={(e) => setSubs((s) => ({ ...s, [key]: e.target.value }))}
                    className="rounded-lg border border-slate-200 px-2 py-2 text-sm"
                    disabled={loadingCodes}
                  >
                    <option value="">—</option>
                    {options.map((o) => (
                      <option key={o.code} value={o.code}>
                        {o.code} — {o.label}
                      </option>
                    ))}
                  </select>
                </label>
              );
            })}
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={saving || loadingCodes}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? "Menyimpan…" : "Simpan perubahan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}