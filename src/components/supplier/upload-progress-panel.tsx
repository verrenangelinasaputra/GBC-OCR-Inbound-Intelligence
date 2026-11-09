"use client";

import type { SheetUploadProgressPhase } from "@/lib/services/sheet-only-upload";

const PHASE_WEIGHT: Record<SheetUploadProgressPhase, number> = {
  prepare: 1,
  ocr: 2,
  drive: 3,
  sheet: 4,
  done: 5,
};

const STEPS_PER_FILE = 5;

export type UploadProgressState = {
  active: boolean;
  fileIndex: number;
  fileTotal: number;
  fileName: string;
  message: string;
  phase: SheetUploadProgressPhase;
  percent: number;
};

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
  if (!progress.active) return null;

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
          <p className="mt-2 text-right text-xs font-medium text-slate-600">{progress.percent}%</p>
        </div>

        <p className="mt-4 text-sm text-slate-700">{progress.message}</p>
        <p className="mt-3 text-xs text-slate-500">
          Jangan tutup halaman — OCR Gemini & penyimpanan ke spreadsheet berjalan otomatis.
        </p>
      </div>
    </div>
  );
}
