"use client";

import { useEffect, useState } from "react";
import type { SheetUploadProgressPhase } from "@/lib/services/sheet-only-upload";

const PHASE_WEIGHT: Record<SheetUploadProgressPhase, number> = {
  prepare: 1,
  ocr: 2,
  drive: 3,
  sheet: 4,
  done: 5,
};

const STEPS_PER_FILE = 5;

/** Estimasi kasar per SJ (detik) — mayoritas waktu di OCR Gemini. */
const DEFAULT_SECONDS_PER_FILE = 55;

export type UploadProgressState = {
  active: boolean;
  fileIndex: number;
  fileTotal: number;
  fileName: string;
  message: string;
  phase: SheetUploadProgressPhase;
  percent: number;
  startedAt: number | null;
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
  if (progress.percent >= 4) {
    const remaining = (elapsedMs * (100 - progress.percent)) / progress.percent;
    return Math.max(0, remaining);
  }
  const totalGuessMs = progress.fileTotal * DEFAULT_SECONDS_PER_FILE * 1000;
  return Math.max(0, totalGuessMs - elapsedMs);
}

export function uploadProgressPercent(
  fileIndex: number,
  fileTotal: number,
  phase: SheetUploadProgressPhase
): number {
  if (fileTotal <= 0) return 0;
  const completedUnits = (fileIndex - 1) * STEPS_PER_FILE + PHASE_WEIGHT[phase];
  const totalUnits = fileTotal * STEPS_PER_FILE;
  return Math.min(100, Math.round((completedUnits / totalUnits) * 100));
}

export function UploadProgressPanel({ progress }: { progress: UploadProgressState }) {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!progress.active || progress.startedAt == null) return;
    const id = window.setInterval(() => setTick((t) => t + 1), 1000);
    return () => window.clearInterval(id);
  }, [progress.active, progress.startedAt]);

  if (!progress.active) return null;

  const elapsedMs =
    progress.startedAt != null ? Math.max(0, Date.now() - progress.startedAt) : 0;
  void tick;
  const remainingMs = estimateRemainingMs(progress, elapsedMs);
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
              style={{ width: `${progress.percent}%` }}
            />
          </div>
          <div className="mt-2 flex items-center justify-between gap-2 text-xs text-slate-600">
            <span>
              Berjalan: <span className="font-medium text-slate-800">{formatDurationMs(elapsedMs)}</span>
            </span>
            <span className="font-medium">{progress.percent}%</span>
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
