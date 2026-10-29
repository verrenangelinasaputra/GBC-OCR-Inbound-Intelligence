"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const POLL_MS = 1500;

type OcrStatusResponse = {
  running: boolean;
  lineCount: number;
  googleExported: boolean;
  activeJob: {
    progressPercent: number;
    progressMessage: string | null;
    status: string;
  } | null;
  latestJob: {
    status: string;
    progressPercent: number;
    progressMessage: string | null;
    errorMessage: string | null;
  } | null;
  finished: boolean;
};

const STEPS = [
  { min: 0, label: "Antrian" },
  { min: 12, label: "Baca gambar" },
  { min: 35, label: "Gemini Vision" },
  { min: 72, label: "Simpan DB" },
  { min: 92, label: "Google export" },
  { min: 100, label: "Selesai" },
];

export function OcrJobTracker({
  documentId,
  initiallyRunning,
}: {
  documentId: string;
  initiallyRunning: boolean;
}) {
  const router = useRouter();
  const [polling, setPolling] = useState(initiallyRunning);
  const [status, setStatus] = useState<OcrStatusResponse | null>(null);
  const [retryLoading, setRetryLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchStatus = useCallback(async () => {
    const res = await fetch(`/api/documents/${documentId}/ocr/status`, {
      cache: "no-store",
    });
    const data = (await res.json().catch(() => null)) as OcrStatusResponse | null;
    if (!res.ok || !data) return null;
    setStatus(data);
    return data;
  }, [documentId]);

  useEffect(() => {
    if (!polling) return;
    let cancelled = false;

    async function tick() {
      const data = await fetchStatus();
      if (cancelled || !data) return;
      if (!data.running && data.finished) {
        setPolling(false);
        router.refresh();
        window.dispatchEvent(new CustomEvent("gbc:ocr-lines-refresh"));
        return;
      }
      if (data.running) {
        setTimeout(tick, POLL_MS);
      } else {
        setPolling(false);
      }
    }

    void tick();
    return () => {
      cancelled = true;
    };
  }, [polling, fetchStatus, router]);

  useEffect(() => {
    if (initiallyRunning) {
      void fetchStatus();
    }
  }, [initiallyRunning, fetchStatus]);

  async function onRetry() {
    setRetryLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/documents/${documentId}/ocr/retry`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Retry gagal");
        return;
      }
      setPolling(true);
      await fetchStatus();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request gagal");
    } finally {
      setRetryLoading(false);
    }
  }

  const percent =
    status?.activeJob?.progressPercent ??
    status?.latestJob?.progressPercent ??
    (polling ? 8 : 0);
  const message =
    status?.activeJob?.progressMessage ??
    status?.latestJob?.progressMessage ??
    (polling ? "Memulai…" : "");
  const showBar = polling || (status?.running ?? initiallyRunning);

  return (
    <div className="w-full min-w-[240px] flex-1 space-y-3">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onRetry}
          disabled={retryLoading || showBar}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50 disabled:opacity-50"
        >
          {retryLoading ? "Memulai…" : showBar ? "OCR berjalan…" : "Retry OCR (Gemini)"}
        </button>
      </div>

      {showBar && (
        <div className="rounded-lg border border-blue-100 bg-blue-50/80 p-3">
          <div className="mb-1 flex justify-between text-xs text-slate-700">
            <span className="font-medium">{message || "Memproses OCR…"}</span>
            <span>{percent}%</span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-full rounded-full bg-blue-600 transition-[width] duration-500 ease-out"
              style={{ width: `${Math.max(percent, 4)}%` }}
            />
          </div>
          <ul className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[10px] uppercase tracking-wide text-slate-500">
            {STEPS.map((step) => (
              <li
                key={step.label}
                className={percent >= step.min ? "font-semibold text-blue-700" : ""}
              >
                {step.label}
              </li>
            ))}
          </ul>
          <p className="mt-2 text-[11px] text-slate-500">
            Halaman refresh otomatis saat selesai. Jangan tutup tab ini.
          </p>
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}
      {status?.latestJob?.status === "FAILED" && !showBar && status.latestJob.errorMessage && (
        <p className="text-xs text-red-600">{status.latestJob.errorMessage}</p>
      )}
    </div>
  );
}
