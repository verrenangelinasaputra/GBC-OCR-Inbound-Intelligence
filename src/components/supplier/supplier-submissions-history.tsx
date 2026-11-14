"use client";

import { Fragment, useCallback, useMemo, useState } from "react";
import type { SubmissionHistoryRow } from "@/lib/services/ocr-sheet-submissions-shared";
import { supplierCanConfirmReceipt } from "@/lib/services/ocr-sheet-submissions-shared";
import { ReviewStatusBadge } from "@/components/ocr-review/review-status-badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { downloadSubmissionsWord } from "@/lib/utils/export-submissions-table";
import { warehouseReviewWaitSortKey } from "@/lib/ocr-review/workflow-timeline";
import { WarehouseWaitBadge, WorkflowTimelineCompact } from "@/components/ocr-review/workflow-timeline";
import {
  ArrowDownUp,
  ChevronDown,
  ChevronRight,
  FileDown,
  Package,
  Printer,
  RefreshCw,
  Search,
  Truck,
} from "lucide-react";

type SortKey = keyof SubmissionHistoryRow;
type SortDir = "asc" | "desc";

type DocGroup = {
  docKey: string;
  head: SubmissionHistoryRow;
  lines: SubmissionHistoryRow[];
};

const COLUMNS: { key: SortKey; label: string; className?: string }[] = [
  { key: "gudang", label: "Gudang" },
  { key: "supplier", label: "Supplier" },
  { key: "exportTimestamp", label: "Ekspor" },
  { key: "tanggal", label: "Tanggal SJ" },
  { key: "noSuratJalan", label: "No. SJ" },
  { key: "noKendaraan", label: "Kendaraan" },
  { key: "namaBarang", label: "Barang" },
  { key: "jumlah", label: "Jumlah" },
  { key: "status", label: "Status OCR" },
  { key: "statusReview", label: "Status gudang" },
  { key: "sampleType", label: "Tipe Sample" },
];

function compareValues(a: string, b: string, dir: SortDir): number {
  const na = Number(a);
  const nb = Number(b);
  if (!Number.isNaN(na) && !Number.isNaN(nb) && a !== "" && b !== "") {
    return dir === "asc" ? na - nb : nb - na;
  }
  return dir === "asc" ? a.localeCompare(b, "id") : b.localeCompare(a, "id");
}

function parseDdMmYyyy(s: string): number | null {
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s.trim());
  if (!m) return null;
  return new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1])).getTime();
}

/** Angka dari kolom Jumlah, mis. `8736 PCS` → 8736 */
function parseQtyFromJumlah(jumlah: string): number {
  const m = /^([\d.,]+)/.exec(String(jumlah ?? "").trim());
  if (!m) return 0;
  const n = Number(m[1].replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

function formatUnitCount(n: number): string {
  return new Intl.NumberFormat("id-ID").format(n);
}

export function SupplierSubmissionsHistory({
  initialRows,
  sheetUrl,
  companyLabel,
  isMaster,
}: {
  initialRows: SubmissionHistoryRow[];
  sheetUrl: string | null;
  companyLabel: string;
  isMaster: boolean;
}) {
  const [rows, setRows] = useState(initialRows);
  const [search, setSearch] = useState("");
  const [gudang, setGudang] = useState("ALL");
  const [status, setStatus] = useState("ALL");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("exportTimestamp");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [sortByWaitReview, setSortByWaitReview] = useState(true);
  const [timelineDocKey, setTimelineDocKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ docKey: string; index: number; label: string } | null>(
    null
  );
  const [confirmingDoc, setConfirmingDoc] = useState<string | null>(null);
  const [expandedDocs, setExpandedDocs] = useState<Set<string>>(() => new Set());
  const [viewGrouped, setViewGrouped] = useState(true);

  const gudangOptions = useMemo(() => {
    const set = new Set<string>();
    for (const r of rows) {
      const g = r.gudang.trim();
      if (g) set.add(g);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, "id"));
  }, [rows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = [...rows];
    if (gudang !== "ALL") list = list.filter((r) => r.gudang === gudang);
    if (status !== "ALL") list = list.filter((r) => r.status.toUpperCase() === status);
    if (dateFrom) {
      const from = parseDdMmYyyy(dateFrom);
      if (from != null) {
        list = list.filter((r) => {
          const t = parseDdMmYyyy(r.tanggal) ?? parseDdMmYyyy(r.exportTimestamp);
          return t != null && t >= from;
        });
      }
    }
    if (dateTo) {
      const to = parseDdMmYyyy(dateTo);
      if (to != null) {
        list = list.filter((r) => {
          const t = parseDdMmYyyy(r.tanggal) ?? parseDdMmYyyy(r.exportTimestamp);
          return t != null && t <= to;
        });
      }
    }
    if (q) {
      list = list.filter((r) =>
        COLUMNS.some((c) => String(r[c.key] ?? "").toLowerCase().includes(q))
      );
    }
    if (sortByWaitReview) {
      list.sort((a, b) => warehouseReviewWaitSortKey(b) - warehouseReviewWaitSortKey(a));
    } else {
      list.sort((a, b) => compareValues(String(a[sortKey] ?? ""), String(b[sortKey] ?? ""), sortDir));
    }
    return list;
  }, [rows, search, gudang, status, dateFrom, dateTo, sortKey, sortDir, sortByWaitReview]);

  const docGroups = useMemo(() => {
    const byDoc = new Map<string, SubmissionHistoryRow[]>();
    const order: string[] = [];
    for (const r of filtered) {
      if (!byDoc.has(r.docKey)) order.push(r.docKey);
      const list = byDoc.get(r.docKey) ?? [];
      list.push(r);
      byDoc.set(r.docKey, list);
    }
    const groups: DocGroup[] = order.map((docKey) => {
      const lines = byDoc.get(docKey) ?? [];
      return { docKey, head: lines[0]!, lines };
    });
    return groups;
  }, [filtered]);

  const stats = useMemo(() => {
    let totalUnits = 0;
    const uploads = new Set<string>();
    for (const r of filtered) {
      totalUnits += parseQtyFromJumlah(r.jumlah);
      uploads.add(r.docKey);
    }
    return { totalUnits, totalPengiriman: uploads.size };
  }, [filtered]);

  function toggleDocExpanded(docKey: string) {
    setExpandedDocs((prev) => {
      const next = new Set(prev);
      if (next.has(docKey)) next.delete(docKey);
      else next.add(docKey);
      return next;
    });
  }

  function ocrSummary(lines: SubmissionHistoryRow[]): string {
    const ok = lines.filter((l) => l.status.toUpperCase() === "OK").length;
    const cek = lines.filter((l) => l.status.toUpperCase() === "CEK").length;
    const parts: string[] = [];
    if (ok) parts.push(`${ok} OK`);
    if (cek) parts.push(`${cek} CEK`);
    return parts.length ? parts.join(", ") : "—";
  }

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/supplier/submissions");
      const data = (await res.json()) as { rows?: SubmissionHistoryRow[]; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Gagal memuat");
      setRows(data.rows ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal memuat");
    } finally {
      setLoading(false);
    }
  }, []);

  const confirmReceipt = useCallback(async (docKey: string, noSj: string) => {
    const ok = window.confirm(
      `Konfirmasi Anda sudah menerima data revisi / hasil gudang untuk SJ ${noSj || "?"}?\n\nStatus akan menjadi Selesai di spreadsheet GBC.`
    );
    if (!ok) return;
    setConfirmingDoc(docKey);
    setError(null);
    try {
      const res = await fetch("/api/supplier/submissions/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ docKey }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Gagal konfirmasi");
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal konfirmasi");
    } finally {
      setConfirmingDoc(null);
    }
  }, [refresh]);

  const exportMeta = `Diekspor ${new Date().toLocaleString("id-ID")} · ${filtered.length} baris · ${
    isMaster ? "Semua supplier" : companyLabel
  }`;

  const printPdf = () => {
    const prev = document.title;
    document.title = "Status Pengiriman GBC";
    window.print();
    document.title = prev;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Status Pengiriman</h1>
          <p className="mt-1 text-sm text-slate-500">
            Data real-time dari spreadsheet operasional GBC
            {isMaster ? " (semua supplier)" : ` — ${companyLabel}`}.
            {sheetUrl && (
              <>
                {" "}
                <a href={sheetUrl} target="_blank" rel="noreferrer" className="text-blue-600 underline">
                  Buka Sheet
                </a>
              </>
            )}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 print:hidden">
          <button
            type="button"
            onClick={refresh}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <button
            type="button"
            onClick={() =>
              downloadSubmissionsWord(
                filtered,
                `status-pengiriman-${new Date().toISOString().slice(0, 10)}`,
                exportMeta
              )
            }
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <FileDown className="h-4 w-4" />
            Export Word
          </button>
          <button
            type="button"
            onClick={printPdf}
            className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            <Printer className="h-4 w-4" />
            Export PDF
          </button>
        </div>
      </div>

      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>
      )}

      <div className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm print:hidden sm:grid-cols-2 lg:grid-cols-5">
        <label className="flex flex-col gap-1 sm:col-span-2 lg:col-span-2">
          <span className="text-xs font-medium text-slate-500">Cari</span>
          <span className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="No. SJ, barang, gudang…"
              className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm"
            />
          </span>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-slate-500">Gudang</span>
          <select
            value={gudang}
            onChange={(e) => setGudang(e.target.value)}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
          >
            <option value="ALL">Semua</option>
            {gudangOptions.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-slate-500">Status</span>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
          >
            <option value="ALL">Semua</option>
            <option value="OK">OK</option>
            <option value="CEK">CEK</option>
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-slate-500">Tgl SJ dari (dd/mm/yyyy)</span>
          <input
            type="text"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            placeholder="01/01/2026"
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-slate-500">Tgl SJ sampai</span>
          <input
            type="text"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            placeholder="31/12/2026"
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
        </label>
        <label className="flex flex-col justify-end gap-1 sm:col-span-2">
          <span className="text-xs font-medium text-slate-500">Urutan daftar SJ</span>
          <select
            value={sortByWaitReview ? "wait_review" : "column"}
            onChange={(e) => setSortByWaitReview(e.target.value === "wait_review")}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
          >
            <option value="wait_review">Terlama menunggu tinjauan gudang</option>
            <option value="column">Urut kolom (klik header tabel)</option>
          </select>
        </label>
        <label className="flex flex-col justify-end gap-1 sm:col-span-2 lg:col-span-1">
          <span className="text-xs font-medium text-slate-500">Tampilan tabel</span>
          <select
            value={viewGrouped ? "grouped" : "flat"}
            onChange={(e) => setViewGrouped(e.target.value === "grouped")}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
          >
            <option value="grouped">Per foto / pengiriman (disarankan)</option>
            <option value="flat">Semua baris barang</option>
          </select>
        </label>
      </div>

      <div className="grid gap-4 print:hidden sm:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Total unit</p>
              <p className="mt-1 text-3xl font-semibold tabular-nums text-slate-900">
                {formatUnitCount(stats.totalUnits)}
              </p>
              <p className="mt-1 text-xs text-slate-500">Jumlah dari kolom Jumlah (sesuai filter)</p>
            </div>
            <span className="rounded-lg bg-blue-50 p-2 text-blue-700">
              <Package className="h-5 w-5" />
            </span>
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Total pengiriman (foto)
              </p>
              <p className="mt-1 text-3xl font-semibold tabular-nums text-slate-900">
                {formatUnitCount(stats.totalPengiriman)}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Satu submit / satu file Drive — bukan jumlah No. SJ unik
              </p>
            </div>
            <span className="rounded-lg bg-emerald-50 p-2 text-emerald-700">
              <Truck className="h-5 w-5" />
            </span>
          </div>
        </div>
      </div>

      <p className="text-sm text-slate-500 print:hidden">
        Menampilkan{" "}
        <strong className="text-slate-800">
          {docGroups.length} pengiriman ({filtered.length} baris barang)
        </strong>{" "}
        dari {rows.length} baris total
      </p>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <p className="hidden border-b border-slate-200 px-4 py-3 text-sm font-medium print:block">
          {exportMeta}
        </p>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-800 text-left text-slate-100">
              <tr>
                {COLUMNS.map((col) => (
                  <th key={col.key} className="whitespace-nowrap px-3 py-3 font-medium">
                    <button
                      type="button"
                      onClick={() => toggleSort(col.key)}
                      className="inline-flex items-center gap-1 hover:text-white print:pointer-events-none"
                    >
                      {col.label}
                      {sortKey === col.key && <ArrowDownUp className="h-3.5 w-3.5 opacity-80" />}
                    </button>
                  </th>
                ))}
                <th className="w-10 whitespace-nowrap px-2 py-3 print:hidden" aria-label="Buka detail" />
                <th className="whitespace-nowrap px-3 py-3 print:hidden">Menunggu gudang</th>
                <th className="px-3 py-3 print:hidden">Timeline</th>
                <th className="px-3 py-3 print:hidden">Foto</th>
                <th className="px-3 py-3 print:hidden">Revisi</th>
                <th className="px-3 py-3 print:hidden">Konfirmasi</th>
              </tr>
            </thead>
            <tbody>
              {viewGrouped
                ? docGroups.map((g) => {
                    const r = g.head;
                    const expanded = expandedDocs.has(g.docKey);
                    const lineUnits = g.lines.reduce((sum, l) => sum + parseQtyFromJumlah(l.jumlah), 0);
                    return (
                      <Fragment key={g.docKey}>
                        <tr className="border-t border-slate-200 bg-slate-50/90 font-medium text-slate-900">
                          <td className="px-2 py-2.5 print:hidden">
                            <button
                              type="button"
                              className="rounded p-1 hover:bg-slate-200"
                              aria-expanded={expanded}
                              onClick={() => toggleDocExpanded(g.docKey)}
                              title={expanded ? "Ciutkan barang" : "Lihat barang"}
                            >
                              {expanded ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                            </button>
                          </td>
                          <td className="px-3 py-2.5">{r.gudang}</td>
                          <td className="max-w-[140px] truncate px-3 py-2.5">{r.supplier}</td>
                          <td className="whitespace-nowrap px-3 py-2.5">{r.exportTimestamp}</td>
                          <td className="whitespace-nowrap px-3 py-2.5">{r.tanggal}</td>
                          <td className="px-3 py-2.5 font-semibold">{r.noSuratJalan}</td>
                          <td className="px-3 py-2.5">{r.noKendaraan}</td>
                          <td className="px-3 py-2.5 text-slate-600">
                            {g.lines.length} barang
                            {!expanded ? (
                              <span className="mt-0.5 block text-xs font-normal text-slate-500">
                                Klik panah untuk detail
                              </span>
                            ) : null}
                          </td>
                          <td className="whitespace-nowrap px-3 py-2.5 tabular-nums">
                            {formatUnitCount(lineUnits)} unit
                          </td>
                          <td className="px-3 py-2.5 text-xs text-slate-600">{ocrSummary(g.lines)}</td>
                          <td className="px-3 py-2.5">
                            <ReviewStatusBadge status={r.statusReview} />
                          </td>
                          <td className="px-3 py-2.5">{r.sampleType || "—"}</td>
                          <td className="px-3 py-2.5 print:hidden">
                            <WarehouseWaitBadge fields={r} />
                          </td>
                          <td className="min-w-[120px] px-3 py-2.5 print:hidden">
                            {timelineDocKey === r.docKey ? (
                              <WorkflowTimelineCompact fields={r} />
                            ) : (
                              <button
                                type="button"
                                className="text-xs font-medium text-blue-600 hover:underline"
                                onClick={() => setTimelineDocKey(r.docKey)}
                              >
                                Lihat
                              </button>
                            )}
                          </td>
                          <td className="px-3 py-2.5 print:hidden">
                            {r.fileUrl?.startsWith("http") ? (
                              <a
                                href={r.fileUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="font-medium text-blue-600 hover:underline"
                              >
                                Drive
                              </a>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>
                          <td className="px-3 py-2.5 print:hidden">
                            {r.revisionLinks.length === 0 ? (
                              <span className="text-slate-400">—</span>
                            ) : (
                              <div className="flex flex-wrap gap-1">
                                {r.revisionLinks.map((_, i) => (
                                  <button
                                    key={i}
                                    type="button"
                                    onClick={() =>
                                      setPreview({
                                        docKey: r.docKey,
                                        index: i,
                                        label: `Revisi ${i + 1} · ${r.noSuratJalan}`,
                                      })
                                    }
                                    className="rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900 hover:bg-amber-200"
                                  >
                                    R{i + 1}
                                  </button>
                                ))}
                              </div>
                            )}
                          </td>
                          <td className="px-3 py-2.5 print:hidden">
                            {supplierCanConfirmReceipt(r.statusReview) ? (
                              <button
                                type="button"
                                disabled={confirmingDoc === r.docKey}
                                onClick={() => void confirmReceipt(r.docKey, r.noSuratJalan)}
                                className="rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                              >
                                {confirmingDoc === r.docKey ? "…" : "Terima data"}
                              </button>
                            ) : r.statusReview === "SELESAI" ? (
                              <span className="text-xs text-emerald-700">Selesai</span>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>
                        </tr>
                        {expanded
                          ? g.lines.map((line) => (
                              <tr
                                key={line.rowKey}
                                className="border-t border-slate-100 bg-white text-sm text-slate-700"
                              >
                                <td className="print:hidden" />
                                <td colSpan={6} className="px-3 py-2 pl-8 text-slate-400">
                                  ↳ Item
                                </td>
                                <td className="max-w-[220px] px-3 py-2 font-medium text-slate-800">
                                  {line.namaBarang}
                                </td>
                                <td className="whitespace-nowrap px-3 py-2 tabular-nums">{line.jumlah}</td>
                                <td className="px-3 py-2">
                                  <StatusBadge
                                    label={line.status || "—"}
                                    tone={line.status === "CEK" ? "warning" : "success"}
                                  />
                                </td>
                                <td colSpan={7} className="print:hidden" />
                              </tr>
                            ))
                          : null}
                      </Fragment>
                    );
                  })
                : filtered.map((r) => (
                    <tr key={r.rowKey} className="border-t border-slate-100 odd:bg-white even:bg-slate-50/80">
                      <td className="print:hidden" />
                      {COLUMNS.map((col) => (
                        <td key={col.key} className="max-w-[200px] truncate px-3 py-2.5 text-slate-800">
                          {col.key === "status" ? (
                            <StatusBadge
                              label={r.status || "—"}
                              tone={r.status === "CEK" ? "warning" : "success"}
                            />
                          ) : col.key === "statusReview" ? (
                            <ReviewStatusBadge status={r.statusReview} />
                          ) : (
                            String(r[col.key] ?? "—")
                          )}
                        </td>
                      ))}
                      <td className="px-3 py-2.5 print:hidden">
                        <WarehouseWaitBadge fields={r} />
                      </td>
                      <td className="min-w-[120px] px-3 py-2.5 print:hidden">
                        {timelineDocKey === r.docKey ? (
                          <WorkflowTimelineCompact fields={r} />
                        ) : (
                          <button
                            type="button"
                            className="text-xs font-medium text-blue-600 hover:underline"
                            onClick={() => setTimelineDocKey(r.docKey)}
                          >
                            Lihat
                          </button>
                        )}
                      </td>
                      <td className="px-3 py-2.5 print:hidden">
                        {r.fileUrl?.startsWith("http") ? (
                          <a
                            href={r.fileUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="font-medium text-blue-600 hover:underline"
                          >
                            Drive
                          </a>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 print:hidden">
                        {r.revisionLinks.length === 0 ? (
                          <span className="text-slate-400">—</span>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {r.revisionLinks.map((_, i) => (
                              <button
                                key={i}
                                type="button"
                                onClick={() =>
                                  setPreview({
                                    docKey: r.docKey,
                                    index: i,
                                    label: `Revisi ${i + 1} · ${r.noSuratJalan}`,
                                  })
                                }
                                className="rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900 hover:bg-amber-200"
                              >
                                R{i + 1}
                              </button>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2.5 print:hidden">
                        {supplierCanConfirmReceipt(r.statusReview) ? (
                          <button
                            type="button"
                            disabled={confirmingDoc === r.docKey}
                            onClick={() => void confirmReceipt(r.docKey, r.noSuratJalan)}
                            className="rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                          >
                            {confirmingDoc === r.docKey ? "…" : "Terima data"}
                          </button>
                        ) : r.statusReview === "SELESAI" ? (
                          <span className="text-xs text-emerald-700">Selesai</span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={COLUMNS.length + 6} className="px-4 py-12 text-center text-slate-500">
                    Tidak ada data yang cocok dengan filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {preview && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="max-h-[90vh] w-full max-w-3xl overflow-auto rounded-xl bg-white p-4 shadow-xl">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h3 className="font-medium text-slate-900">{preview.label}</h3>
              <button
                type="button"
                className="rounded-lg border border-slate-200 px-3 py-1 text-sm"
                onClick={() => setPreview(null)}
              >
                Tutup
              </button>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/api/supplier/submissions/revision?docKey=${encodeURIComponent(preview.docKey)}&index=${preview.index}`}
              alt={preview.label}
              className="mx-auto max-h-[75vh] w-full object-contain"
            />
          </div>
        </div>
      )}

    </div>
  );
}
