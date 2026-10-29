"use client";

import { useCallback, useEffect, useState } from "react";
import type { SerializedOcrLine } from "@/lib/serialize/ocr-line-items";

export function OcrReviewPanel({
  documentId,
  header,
}: {
  documentId: string;
  header: Record<string, string | null>;
}) {
  const [lines, setLines] = useState<SerializedOcrLine[]>([]);
  const [loadError, setLoadError] = useState("");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const loadLines = useCallback(async () => {
    setLoadError("");
    try {
      const res = await fetch(`/api/documents/${documentId}/lines`, { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setLoadError(typeof data.error === "string" ? data.error : "Gagal memuat baris OCR");
        return;
      }
      setLines(Array.isArray(data.lines) ? data.lines : []);
    } catch {
      setLoadError("Gagal memuat baris OCR — cek koneksi lalu refresh halaman.");
    } finally {
      setLoading(false);
    }
  }, [documentId]);

  useEffect(() => {
    void loadLines();
  }, [loadLines]);

  useEffect(() => {
    function onRefresh() {
      void loadLines();
    }
    window.addEventListener("gbc:ocr-lines-refresh", onRefresh);
    return () => window.removeEventListener("gbc:ocr-lines-refresh", onRefresh);
  }, [loadLines]);

  async function saveLine(lineId: string, patch: Partial<SerializedOcrLine>) {
    const res = await fetch(`/api/documents/${documentId}/lines`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lineId, ...patch }),
    });
    if (res.ok) setMessage("Tersimpan — nilai verified diperbarui");
  }

  async function suggestMapping(lineId: string) {
    const res = await fetch(`/api/documents/${documentId}/mapping`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lineId, action: "suggest" }),
    });
    const data = await res.json();
    setMessage(data.message ?? "Suggestion loaded — approve manual di SKU Mapping");
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm">
        <p className="font-medium text-slate-800">Header (editable via API — demo UI)</p>
        <dl className="mt-2 grid grid-cols-2 gap-2">
          {Object.entries(header).map(([k, v]) => (
            <div key={k}>
              <dt className="text-xs text-slate-500">{k}</dt>
              <dd>{v ?? "—"}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-2 text-xs text-amber-700">
          Original OCR disimpan terpisah — kolom verified/manual ditandai di database.
        </p>
      </div>

      {loading && <p className="text-sm text-slate-500">Memuat baris OCR…</p>}
      {loadError && <p className="text-sm text-red-600">{loadError}</p>}
      {message && <p className="text-sm text-blue-700">{message}</p>}

      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-100 text-left">
            <tr>
              <th className="px-3 py-2">#</th>
              <th className="px-3 py-2">Nama Supplier (OCR)</th>
              <th className="px-3 py-2">Qty</th>
              <th className="px-3 py-2">Unit</th>
              <th className="px-3 py-2">Banyaknya/Isi/Ket.</th>
              <th className="px-3 py-2">SKU Internal</th>
              <th className="px-3 py-2">Mapping</th>
              <th className="px-3 py-2">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((line) => (
              <tr key={line.id} className="border-t">
                <td className="px-3 py-2">{line.lineNumber}</td>
                <td className="px-3 py-2">{line.supplierProductName}</td>
                <td className="px-3 py-2">
                  <input
                    className="w-20 rounded border px-1"
                    defaultValue={line.quantityRaw ?? ""}
                    onBlur={(e) => saveLine(line.id, { quantityRaw: e.target.value })}
                  />
                </td>
                <td className="px-3 py-2">{line.unitRaw}</td>
                <td className="px-3 py-2 max-w-[200px] truncate text-xs text-slate-600" title={line.lineTotalRaw ?? ""}>
                  {line.lineTotalRaw ?? "—"}
                </td>
                <td className="px-3 py-2">
                  {line.internalProduct ? `${line.internalProduct.sku}` : "—"}
                </td>
                <td className="px-3 py-2">{line.mappingStatus}</td>
                <td className="px-3 py-2">
                  <button
                    type="button"
                    className="text-blue-600 hover:underline"
                    onClick={() => suggestMapping(line.id)}
                  >
                    Suggest SKU
                  </button>
                </td>
              </tr>
            ))}
            {!loading && lines.length === 0 && (
              <tr>
                <td colSpan={8} className="px-3 py-6 text-center text-slate-500">
                  Belum ada baris — jalankan Retry OCR atau tunggu proses selesai.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
