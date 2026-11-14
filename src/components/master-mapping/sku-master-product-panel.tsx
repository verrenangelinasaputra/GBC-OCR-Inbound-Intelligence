"use client";

import { useCallback, useEffect, useState } from "react";
import type { SkuMasterCodeOption } from "@/lib/sku-master/types";
import {
  categoryTabDisplayName,
  resolveSub1ForCategoryTab,
  sub1FieldMode,
} from "@/lib/sku-master/sub1-for-tab";
const SUB_KEYS = ["sub1", "sub2", "sub3", "sub4", "sub5", "sub6", "sub7", "sub8", "sub9"] as const;

type SubKey = (typeof SUB_KEYS)[number];

const fieldClass =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm transition placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20";
const selectClass = `${fieldClass} pr-9`;
const labelClass = "text-xs font-semibold uppercase tracking-wide text-slate-500";

export function SkuMasterProductPanel({
  canEdit,
  generatorTabs,
  subLabels,
  spreadsheetUrl,
  onDataChanged,
}: {
  canEdit: boolean;
  generatorTabs: string[];
  subLabels: string[];
  spreadsheetUrl: string;
  onDataChanged?: () => void;
}) {
  const [categoryTab, setCategoryTab] = useState("PET");
  const [namaProdukAcuan, setNamaProdukAcuan] = useState("");
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
  useEffect(() => {
    if (generatorTabs.length > 0 && !generatorTabs.includes(categoryTab)) {
      setCategoryTab(generatorTabs[0]!);
    }
  }, [generatorTabs, categoryTab]);

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
      onDataChanged?.();
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
          namaInternalAccurate: "",
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
      onDataChanged?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal simpan produk");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-slate-600">
        Generator SKU → tab <strong>TABEL 1</strong> ({categoryTab}) → <strong>REKAP SKUL</strong> /{" "}
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

      <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm ring-1 ring-slate-900/5">
        <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white px-6 py-5">
          <h2 className="text-lg font-semibold tracking-tight text-slate-900">Tambah produk master</h2>
          <p className="mt-1 max-w-2xl text-sm text-slate-600">
            Isi nama dari SJ/OCR dan pilih kode Sub — SKU &amp; REKAP terisi otomatis di spreadsheet.{" "}
            <span className="text-slate-500">Nama internal Accurate bisa ditambah nanti lewat Edit.</span>
          </p>
        </div>

        {!canEdit ? (
          <p className="px-6 py-8 text-sm text-amber-800">Anda hanya bisa melihat.</p>
        ) : (
          <form onSubmit={(e) => void onSubmitProduct(e)} className="space-y-0">
            <div className="space-y-5 border-b border-slate-100 px-6 py-6">
              <div>
                <p className={labelClass}>Kategori</p>
                <p className="mt-2 text-sm text-slate-600">Tab lembar TABEL 1 tempat baris baru ditulis.</p>
                <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Tab kategori">
                  {generatorTabs.map((t) => {
                    const active = categoryTab === t;
                    return (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setCategoryTab(t)}
                        className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                          active
                            ? "bg-slate-900 text-white shadow-md shadow-slate-900/20"
                            : "border border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                        }`}
                      >
                        {t}
                      </button>
                    );
                  })}
                </div>
              </div>

              <label className="block">
                <span className={labelClass}>Nama produk acuan</span>
                <span className="mt-1 block text-sm text-slate-500">Teks yang muncul di surat jalan / hasil OCR</span>
                <input
                  required
                  value={namaProdukAcuan}
                  onChange={(e) => setNamaProdukAcuan(e.target.value)}
                  placeholder="Contoh: BOTOL PET 600ML CLEAR"
                  className={`mt-2 ${fieldClass}`}
                />
              </label>
            </div>

            <div className="bg-slate-50/80 px-6 py-6">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <p className={labelClass}>Spesifikasi (Sub 1–9)</p>
                {loadingCodes ? (
                  <span className="text-xs text-slate-500">Memuat kamus kode…</span>
                ) : (
                  <span className="rounded-full bg-white px-2.5 py-0.5 text-xs text-slate-600 ring-1 ring-slate-200">
                    Tab {categoryTabDisplayName(categoryTab)}
                  </span>
                )}
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {SUB_KEYS.map((key, idx) => {
                  const subIndex = idx + 1;
                  const options = codeOptions[subIndex] ?? [];
                  const label = subLabels[idx] ?? `Sub ${subIndex}`;
                  if (subIndex === 1) {
                    const mode = sub1FieldMode(options);
                    if (mode === "dropdown") {
                      return (
                        <label key={key} className="flex flex-col gap-1.5 sm:col-span-2 lg:col-span-3">
                          <span className="text-sm font-medium text-slate-800">{label}</span>
                          <span className="text-xs text-slate-500">
                            {options.length} pilihan untuk kategori ini
                          </span>
                          <select
                            required
                            value={subs.sub1}
                            onChange={(e) => setSubs((s) => ({ ...s, sub1: e.target.value }))}
                            className={selectClass}
                            disabled={loadingCodes}
                          >
                            {options.length > 1 ? <option value="">— pilih kode Sub 1 —</option> : null}
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
                      <label key={key} className="flex flex-col gap-1.5 sm:col-span-2 lg:col-span-3">
                        <span className="text-sm font-medium text-slate-800">{label}</span>
                        <span className="text-xs text-amber-800">Kamus kosong — memakai default tab</span>
                        <input
                          readOnly
                          value={
                            loadingCodes
                              ? "Memuat…"
                              : `${categoryTabDisplayName(categoryTab)} → ${sub1Value || "—"}`
                          }
                          className="rounded-lg border border-amber-200 bg-amber-50/80 px-3 py-2.5 text-sm text-amber-950"
                        />
                      </label>
                    );
                  }
                  return (
                    <label key={key} className="flex flex-col gap-1.5">
                      <span className="text-sm font-medium text-slate-800">{label}</span>
                      <select
                        value={subs[key]}
                        onChange={(e) => setSubs((s) => ({ ...s, [key]: e.target.value }))}
                        className={selectClass}
                        disabled={loadingCodes}
                      >
                        <option value="">— opsional —</option>
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
            </div>

            <div className="flex flex-col gap-3 border-t border-slate-100 bg-white px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs leading-relaxed text-slate-500">
                SKUS dari Sub 1–6 · SKU lengkap dari Sub 1–9 · sinkron ke REKAP SKUL &amp; SKUS
              </p>
              <button
                type="submit"
                disabled={saving || loadingCodes}
                className="inline-flex shrink-0 items-center justify-center rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm shadow-blue-600/25 transition hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? "Menyimpan…" : "Simpan ke TABEL & REKAP"}
              </button>
            </div>
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

    </div>
  );
}