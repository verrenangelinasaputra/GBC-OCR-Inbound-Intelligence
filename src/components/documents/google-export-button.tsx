"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function GoogleExportButton({
  documentId,
  exportedAt,
  lastError,
}: {
  documentId: string;
  exportedAt: string | null;
  lastError: string | null;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function onExport(force: boolean) {
    setLoading(true);
    setMessage("");
    try {
      const res = await fetch(`/api/documents/${documentId}/google/export`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ force }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage(typeof data.error === "string" ? data.error : "Export gagal");
        return;
      }
      if (data.warning) {
        setMessage(`Sheet OK — peringatan Drive: ${data.warning}`);
      } else {
        setMessage("Export Google berhasil.");
      }
      router.refresh();
    } catch {
      setMessage("Koneksi gagal");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="text-sm">
      <button
        type="button"
        disabled={loading}
        onClick={() => onExport(!!exportedAt || !!lastError)}
        className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-emerald-900 hover:bg-emerald-100 disabled:opacity-50"
      >
        {loading
          ? "Export…"
          : exportedAt
            ? "Export ulang Google"
            : "Kirim ke Google Sheet + Drive"}
      </button>
      {message && <p className="mt-2 text-xs text-slate-700">{message}</p>}
    </div>
  );
}
