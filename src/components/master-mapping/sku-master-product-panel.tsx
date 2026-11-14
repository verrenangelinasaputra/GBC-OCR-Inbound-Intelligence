"use client";

import { useCallback, useEffect, useState } from "react";
import type { SkuMasterCodeOption } from "@/lib/sku-master/types";
import {
  categoryTabDisplayName,
  resolveSub1ForCategoryTab,
  sub1FieldMode,
} from "@/lib/sku-master/sub1-for-tab";
import { SkuMasterListTabs } from "@/components/master-mapping/sku-master-list-tabs";

const SUB_KEYS = ["sub1", "sub2", "sub3", "sub4", "sub5", "sub6", "sub7", "sub8", "sub9"] as const;

type SubKey = (typeof SUB_KEYS)[number];

export function SkuMasterProductPanel({ canEdit }: { canEdit: boolean }) {
  const [generatorTabs, setGeneratorTabs] = useState<string[]>([]);
  const [subLabels, setSubLabels] = useState<string[]>([]);
  const [spreadsheetUrl, setSpreadsheetUrl] = useState("");
  const [categoryTab, setCategoryTab] = useState("PET");
  const [namaProdukAcuan, setNamaProdukAcuan] = useState("");
  const [namaInternalAccurate, setNamaInternalAccurate] = useState("");
  const [subs, setSubs] = useState<Record<SubKey, string>>({
    sub1: "",
    sub2: "",
    sub3: "",
    sub4: "",
    sub5: "",
    sub6: "",
    sub7: "",
    sub8: "",
    sub9: "",
  });
  const [codeOptions, setCodeOptions] = useState<Record<number, SkuMasterCodeOption[]>>({});
  const [loadingCodes, setLoadingCodes] = useState(false);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [newCodeSub, setNewCodeSub] = useState(1);
  const [newCode, setNewCode] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [listRefreshKey, setListRefreshKey] = useState(0);

  const loadMeta = useCallback(async () => {
    const res = await fetch("/api/sku-master/meta");
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Gagal memuat meta");
    setGeneratorTabs(data.generatorTabs ?? []);
    setSubLabels(data.subLabels ?? []);
    setSpreadsheetUrl(data.spreadsheetUrl ?? "");
    if (data.generatorTabs?.length && !data.generatorTabs.includes(categoryTab)) {
      setCategoryTab(data.generatorTabs[0]);
    }
  }, [categoryTab]);

  const loadAllCodes = useCallback(async () => {
    setLoadingCodes(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/sku-master/codes?tab=${encodeURIComponent(categoryTab)}&all=1`
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal memuat kode");
      setCodeOptions((data.bySub as Record<number, SkuMasterCodeOption[]>) ?? {});
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal memuat kode");
    } finally {
      setLoadingCodes(false);
    }
  }, [categoryTab]);

  useEffect(() => {
    void loadMeta().catch((e) => setError(e instanceof Error ? e.message : "Gagal memuat"));
  }, [loadMeta]);

  useEffect(() => {
    void loadAllCodes();
  }, [loadAllCodes]);

  useEffect(() => {
    const opts = codeOptions[1] ?? [];
    const mode = sub1FieldMode(opts);
    setSubs((s) => {
      if (mode === "dropdown") {
        if (opts.length === 1) return { ...s, sub1: opts[0]!.code };
        if (s.sub1 && opts.some((o) => o.code === s.sub1)) return s;
        return { ...s, sub1: "" };
      }
      const sub1 = resolveSub1ForCategoryTab(categoryTab, opts);
      return s.sub1 === sub1 ? s : { ...s, sub1 };
    });
  }, [categoryTab, codeOptions]);

  const [syncCooldownUntil, setSyncCooldownUntil] = useState(0);

  async function onSync() {
    if (!canEdit) return;
    if (Date.now() < syncCooldownUntil) {
      setError("Tunggu ~90 detik sebelum sync lagi (kuota Google Sheets).");
      return;
    }
    setSyncing(true);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch("/api/sku-master/sync", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Sync gagal");
      setSyncCooldownUntil(Date.now() + 90_000);
      setListRefreshKey((k) => k + 1);
      setMessage(
        `Mirror selesai — kode: ${data.summary?.codes ?? 0}, REKAP SKUL: ${data.summary?.rekapSkul ?? 0}, REKAP SKUS: ${data.summary?.rekapSkus ?? 0}${data.summary?.dbPersisted ? " (tersimpan di DB)" : ""}. Jangan spam sync — tunggu 1–2 menit jika kuota habis.`
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sync gagal");
    } finally {
      setSyncing(false);
    }
  }

  async function onAddCode(e: React.FormEvent) {
    e.preventDefault();
    if (!canEdit) return;
    setError(null);
    try {
      const res = await fetch("/api/sku-master/codes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tab: categoryTab,
          sub: newCodeSub,
          code: newCode,
          label: newLabel,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal tambah kode");
      setNewCode("");
      setNewLabel("");
      setMessage(`Kode baru ditambahkan untuk Sub ${newCodeSub}.`);
      await loadAllCodes();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal tambah kode");
    }
  }

  async function onSubmitProduct(e: React.FormEvent) {
    e.preventDefault();
    if (!canEdit) return;
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch("/api/sku-master/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categoryTab,
          namaProdukAcuan,
          namaInternalAccurate,
          ...subs,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal simpan produk");
      const p = data.product;
      setMessage(
        `Produk tersimpan — SKU: ${p?.skuLengkap ?? "?"}, SKUS: ${p?.skus ?? "?"}. REKAP SKUL & spreadsheet ter-update.`
      );
      setNamaProdukAcuan("");
      setNamaInternalAccurate("");
      const sub1Default = (() => {
        const opts = codeOptions[1] ?? [];
        return sub1FieldMode(opts) === "dropdown"
          ? ""
          : resolveSub1ForCategoryTab(categoryTab, opts);
      })();
      setSubs({
        sub1: sub1Default,
        sub2: "",
        sub3: "",
        sub4: "",
        sub5: "",
        sub6: "",
        sub7: "",
        sub8: "",
        sub9: "",
      });
      setListRefreshKey((k) => k + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal simpan produk");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-slate-600">
        Generator master produk → tab <strong>TABEL 1</strong> ({categoryTab}) → <strong>REKAP SKUL</strong> /{" "}
        <strong>REKAP SKUS</strong> di{" "}
        {spreadsheetUrl ? (
          <a href={spreadsheetUrl} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
            spreadsheet sumber
          </a>
        ) : (
          "spreadsheet"
        )}
        . <strong>SKUS</strong> memakai Sub 1–6; <strong>SKU lengkap</strong> memakai Sub 1–9.
      </p>

      {message ? (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-900">{message}</p>
      ) : null}
      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-800">{error}</p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={!canEdit || syncing || Date.now() < syncCooldownUntil}
          onClick={() => void onSync()}
          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-800 hover:bg-slate-50 disabled:opacity-50"
        >
          {syncing ? "Sync…" : "Sync mirror dari spreadsheet"}
        </button>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-base font-semibold text-slate-900">Tambah produk master</h2>
        {!canEdit ? (
          <p className="mt-2 text-sm text-amber-800">Anda hanya bisa melihat.</p>
        ) : (
          <form onSubmit={(e) => void onSubmitProduct(e)} className="mt-4 space-y-4">
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-slate-600">Tab kategori</span>
              <select
                value={categoryTab}
                onChange={(e) => setCategoryTab(e.target.value)}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
              >
                {generatorTabs.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="flex flex-col gap-1 sm:col-span-2">
                <span className="text-xs font-medium text-slate-600">Nama produk acuan (SJ / OCR)</span>
                <input
                  required
                  value={namaProdukAcuan}
                  onChange={(e) => setNamaProdukAcuan(e.target.value)}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                />
              </label>
              <label className="flex flex-col gap-1 sm:col-span-2">
                <span className="text-xs font-medium text-slate-600">Nama internal Accurate</span>
                <input
                  required
                  value={namaInternalAccurate}
                  onChange={(e) => setNamaInternalAccurate(e.target.value)}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                />
              </label>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {SUB_KEYS.map((key, idx) => {
                const subIndex = idx + 1;
                const options = codeOptions[subIndex] ?? [];
                const label = subLabels[idx] ?? `Sub ${subIndex}`;
                if (subIndex === 1) {
                  const mode = sub1FieldMode(options);
                  if (mode === "dropdown") {
                    return (
                      <label key={key} className="flex flex-col gap-1 sm:col-span-2">
                        <span className="text-xs font-medium text-slate-600">
                          {label}{" "}
                          <span className="font-normal text-slate-500">
                            (tab {categoryTabDisplayName(categoryTab)} — {options.length} pilihan)
                          </span>
                        </span>
                        <select
                          required
                          value={subs.sub1}
                          onChange={(e) => setSubs((s) => ({ ...s, sub1: e.target.value }))}
                          className="rounded-lg border border-slate-200 bg-white px-2 py-2 text-sm"
                          disabled={loadingCodes}
                        >
                          {options.length > 1 ? (
                            <option value="">— pilih kode Sub 1 —</option>
                          ) : null}
                          {options.map((o) => (
                            <option key={o.code} value={o.code}>
                              {o.code} — {o.label}
                            </option>
                          ))}
                        </select>
                      </label>
                    );
                  }
                  const sub1Value = resolveSub1ForCategoryTab(categoryTab, options);
                  return (
                    <label key={key} className="flex flex-col gap-1 sm:col-span-2">
                      <span className="text-xs font-medium text-slate-600">
                        {label}{" "}
                        <span className="font-normal text-amber-700">
                          (kamus kosong — pakai default tab {categoryTabDisplayName(categoryTab)})
                        </span>
                      </span>
                      <input
                        readOnly
                        value={
                          loadingCodes
                            ? "Memuat…"
                            : `${categoryTabDisplayName(categoryTab)} → ${sub1Value || "—"}`
                        }
                        className="rounded-lg border border-amber-200 bg-amber-50 px-2 py-2 text-sm"
                      />
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

            <button
              type="submit"
              disabled={saving || loadingCodes}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? "Menyimpan ke spreadsheet…" : "Simpan → TABEL & REKAP"}
            </button>
          </form>
        )}
      </section>

      {canEdit ? (
        <section className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5">
          <h3 className="text-sm font-semibold text-slate-800">Tambah kode kamus (Sub 1–9)</h3>
          <form onSubmit={(e) => void onAddCode(e)} className="mt-3 flex flex-wrap items-end gap-3">
            <label className="flex flex-col gap-1">
              <span className="text-xs text-slate-600">Sub</span>
              <select
                value={newCodeSub}
                onChange={(e) => setNewCodeSub(Number(e.target.value))}
                className="rounded border border-slate-200 px-2 py-1.5 text-sm"
              >
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs text-slate-600">Kode</span>
              <input
                required
                value={newCode}
                onChange={(e) => setNewCode(e.target.value)}
                className="rounded border border-slate-200 px-2 py-1.5 text-sm"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs text-slate-600">Keterangan</span>
              <input
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                className="rounded border border-slate-200 px-2 py-1.5 text-sm"
              />
            </label>
            <button
              type="submit"
              className="rounded-lg bg-slate-800 px-3 py-2 text-sm font-medium text-white hover:bg-slate-900"
            >
              Tambah kode
            </button>
          </form>
        </section>
      ) : null}

      {generatorTabs.length > 0 ? (
        <SkuMasterListTabs
          generatorTabs={generatorTabs}
          refreshKey={listRefreshKey}
          canEdit={canEdit}
          onRowEdited={() => setListRefreshKey((k) => k + 1)}
        />
      ) : null}
    </div>
  );
}