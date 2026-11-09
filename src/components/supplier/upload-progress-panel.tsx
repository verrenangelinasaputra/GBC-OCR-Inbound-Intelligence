"use client";

import { useEffect, useState } from "react";
import type { SheetUploadProgressPhase } from "@/lib/services/sheet-only-upload";

/** Fraksi progres dalam satu file (OCR = mayoritas waktu). */
const PHASE_FRACTION: Record<SheetUploadProgressPhase, number> = {
  prepare: 0.06,
  ocr: 0.2,
  drive: 0.88,
  sheet: 0.96,
  done: 1,
};

/** Estimasi kasar per SJ (detik) — flash-lite + resize 1400px. */
const DEFAULT_SECONDS_PER_FILE = 55;
const OCR_PHASE_FILL_MS = 70_000;

export type UploadProgressState = {
  active: boolean;
  fileIndex: number;
  fileTotal: number;
  fileName: string;
  message: string;
  phase: SheetUploadProgressPhase;
  percent: number;
  startedAt: number | null;
  phaseStartedAt: number | null;
};

function formatDurationMs(ms: number): string {
  const sec = Math.max(0, Math.round(ms / 1000));
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  if (m > 0) return `${m} menit ${s} detik`;
  return `${s} detik`;
}

function formatClockTime(date: Date): string {
  return date.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function estimateRemainingMs(progress: UploadProgressState, elapsedMs: number): number {
  if (progress.percent >= 100) return 0;
  const perFileMs = DEFAULT_SECONDS_PER_FILE * 1000;
  const totalGuessMs = progress.fileTotal * perFileMs;
  const fileBased = Math.max(0, totalGuessMs - elapsedMs);

  if (progress.percent < 18) {
    return fileBased;
  }
  const linear = (elapsedMs * (100 - progress.percent)) / progress.percent;
  return Math.max(0, Math.min(linear, fileBased * 1.25));
}

export function uploadProgressPercent(
  fileIndex: number,
  fileTotal: number,
  phase: SheetUploadProgressPhase
): number {
  if (fileTotal <= 0) return 0;
  const fileSpan = 100 / fileTotal;
  const base = (fileIndex - 1) * fileSpan;
  return Math.min(100, Math.round(base + PHASE_FRACTION[phase] * fileSpan));
}

function displayPercent(progress: UploadProgressState, now: number): number {
  if (fileTotalInvalid(progress)) return progress.percent;
  const fileSpan = 100 / progress.fileTotal;
  const base = (progress.fileIndex - 1) * fileSpan;

  if (progress.phase === "ocr" && progress.phaseStartedAt != null) {
    const ocrElapsed = Math.max(0, now - progress.phaseStartedAt);
    const t = Math.min(1, ocrElapsed / OCR_PHASE_FILL_MS);
    const ocrLo = base + PHASE_FRACTION.prepare * fileSpan;
    const ocrHi = base + 0.86 * fileSpan;
    const interpolated = Math.round(ocrLo + t * (ocrHi - ocrLo));
    return Math.max(progress.percent, Math.min(interpolated, ocrHi));
  }
  return progress.percent;
}

function fileTotalInvalid(p: UploadProgressState): boolean {
  return p.fileTotal <= 0;
}

export function UploadProgressPanel({ progress }: { progress: UploadProgressState }) {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!progress.active || progress.startedAt == null) return;
    const id = window.setInterval(() => setTick((t) => t + 1), 1000);
    return () => window.clearInterval(id);
  }, [progress.active, progress.startedAt]);

  if (!progress.active) return null;

  const now = Date.now();
  const elapsedMs = progress.startedAt != null ? Math.max(0, now - progress.startedAt) : 0;
  void tick;
  const barPercent = displayPercent(progress, now);
  const remainingMs = estimateRemainingMs({ ...progress, percent: barPercent }, elapsedMs);
  const finishAt = new Date(Date.now() + remainingMs);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/45 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="upload-progress-title"
      aria-busy="true"
    >
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-xl">
        <h2 id="upload-progress-title" className="text-lg font-semibold text-slate-900">
          Memproses Surat Jalan
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Gambar{" "}
          <span className="font-medium text-slate-800">
            {progress.fileIndex} dari {progress.fileTotal}
          </span>
        </p>
        <p className="mt-1 truncate text-xs text-slate-500" title={progress.fileName}>
          {progress.fileName}
        </p>

        <div className="mt-5">
          <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-blue-600 transition-all duration-300 ease-out"
              style={{ width: `${barPercent}%` }}
            />
          </div>
          <div className="mt-2 flex items-center justify-between gap-2 text-xs text-slate-600">
            <span>
              Berjalan: <span className="font-medium text-slate-800">{formatDurationMs(elapsedMs)}</span>
            </span>
            <span className="font-medium">{barPercent}%</span>
          </div>
        </div>

        <div className="mt-4 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2.5 text-xs text-slate-600">
          {progress.percent >= 100 ? (
            <p>Selesai dalam {formatDurationMs(elapsedMs)}.</p>
          ) : (
            <>
              <p>
                Estimasi sisa:{" "}
                <span className="font-medium text-slate-800">~{formatDurationMs(remainingMs)}</span>
              </p>
              <p className="mt-1">
                Perkiraan selesai:{" "}
                <span className="font-medium text-slate-800">± {formatClockTime(finishAt)}</span>
                {progress.percent < 4 && (
                  <span className="text-slate-500"> (awal proses — akan disesuaikan setelah OCR jalan)</span>
                )}
              </p>
            </>
          )}
        </div>

        <p className="mt-4 text-sm text-slate-700">{progress.message}</p>
        <p className="mt-3 text-xs text-slate-500">
          Jangan tutup halaman — OCR Gemini & penyimpanan ke spreadsheet berjalan otomatis.
        </p>
      </div>
    </div>
  );
}
