"use client";

import { useCallback, useEffect, useState } from "react";
import { SkuMasterListTabs } from "@/components/master-mapping/sku-master-list-tabs";
import { SkuMasterProductPanel } from "@/components/master-mapping/sku-master-product-panel";

type MasterSkuView = "generator" | "daftar";

export function SkuMasterWorkspace({ canEdit }: { canEdit: boolean }) {
  const [view, setView] = useState<MasterSkuView>("generator");
  const [generatorTabs, setGeneratorTabs] = useState<string[]>([]);
  const [subLabels, setSubLabels] = useState<string[]>([]);
  const [spreadsheetUrl, setSpreadsheetUrl] = useState("");
  const [metaError, setMetaError] = useState<string | null>(null);
  const [metaLoading, setMetaLoading] = useState(true);
  const [listRefreshKey, setListRefreshKey] = useState(0);

  const bumpList = useCallback(() => setListRefreshKey((k) => k + 1), []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setMetaLoading(true);
      setMetaError(null);
      try {
        const res = await fetch("/api/sku-master/meta");
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Gagal memuat meta");
        if (cancelled) return;
        setGeneratorTabs(data.generatorTabs ?? []);
        setSubLabels(data.subLabels ?? []);
        setSpreadsheetUrl(data.spreadsheetUrl ?? "");
      } catch (e) {
        if (!cancelled) setMetaError(e instanceof Error ? e.message : "Gagal memuat meta");
      } finally {
        if (!cancelled) setMetaLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-5">
      <MasterSkuSubNav view={view} onChange={setView} />

      {metaError ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-800">{metaError}</p>
      ) : null}

      {metaLoading && generatorTabs.length === 0 ? (
        <p className="text-sm text-slate-500">Memuat konfigurasi master SKU…</p>
      ) : null}

      {view === "generator" ? (
        <SkuMasterProductPanel
          canEdit={canEdit}
          generatorTabs={generatorTabs}
          subLabels={subLabels}
          spreadsheetUrl={spreadsheetUrl}
          onDataChanged={bumpList}
        />
      ) : null}

      {view === "daftar" && generatorTabs.length > 0 ? (
        <SkuMasterListTabs
          generatorTabs={generatorTabs}
          refreshKey={listRefreshKey}
          canEdit={canEdit}
          onRowEdited={bumpList}
        />
      ) : null}

      {view === "daftar" && !metaLoading && generatorTabs.length === 0 ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Tidak ada tab kategori. Periksa spreadsheet master.
        </p>
      ) : null}
    </div>
  );
}

function MasterSkuSubNav({
  view,
  onChange,
}: {
  view: MasterSkuView;
  onChange: (v: MasterSkuView) => void;
}) {
  return (
    <div
      className="inline-flex rounded-xl border border-slate-200 bg-slate-100/80 p-1 shadow-sm"
      role="tablist"
      aria-label="Master SKU"
    >
      <button
        type="button"
        role="tab"
        aria-selected={view === "generator"}
        onClick={() => onChange("generator")}
        className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
          view === "generator"
            ? "bg-white text-slate-900 shadow-sm ring-1 ring-slate-200/80"
            : "text-slate-600 hover:text-slate-900"
        }`}
      >
        Generator SKU
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={view === "daftar"}
        onClick={() => onChange("daftar")}
        className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
          view === "daftar"
            ? "bg-white text-slate-900 shadow-sm ring-1 ring-slate-200/80"
            : "text-slate-600 hover:text-slate-900"
        }`}
      >
        Daftar data (TABEL &amp; REKAP)
      </button>
    </div>
  );
}