"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ImagePlus, Trash2, X } from "lucide-react";
import { SUPPLIER_GUDANG_OPTIONS, SUPPLIER_MAX_SJ_FILES } from "@/lib/config/supplier-gudang";

type StagedFile = {
  id: string;
  file: File;
  previewUrl: string;
};

type UploadResult = {
  submissionRef?: string;
  shipmentRef?: string;
  fileCount?: number;
  gudang?: string;
  duplicateDetected?: boolean;
  ocrError?: string;
  sheetRowCount?: number;
  sheetUrl?: string;
  sheetTab?: string;
  uploads?: { submissionRef: string; suratJalanNumber?: string; sheetRowCount: number }[];
  driveFileUrl?: string;
  driveWarning?: string;
  message?: string;
};

const ACCEPT = ".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf";

function fileId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function SupplierUploadForm() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [sheetOnly, setSheetOnly] = useState(false);
  const [staged, setStaged] = useState<StagedFile[]>([]);
  const [gudang, setGudang] = useState("");
  const [notes, setNotes] = useState("");
  const [vehicleInfo, setVehicleInfo] = useState("");
  const [verifyOpen, setVerifyOpen] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState("");

  useEffect(() => {
    fetch("/api/app-mode")
      .then((r) => r.json())
      .then((d) => setSheetOnly(Boolean(d.sheetOnly)))
      .catch(() => setSheetOnly(false));
  }, []);

  const revokeAll = useCallback((items: StagedFile[]) => {
    items.forEach((s) => URL.revokeObjectURL(s.previewUrl));
  }, []);

  useEffect(() => () => revokeAll(staged), [revokeAll, staged]);

  function addFiles(incoming: FileList | null) {
    if (!incoming?.length) return;
    const room = SUPPLIER_MAX_SJ_FILES - staged.length;
    if (room <= 0) {
      setError(`Maksimal ${SUPPLIER_MAX_SJ_FILES} file per submit`);
      return;
    }
    const next: StagedFile[] = [];
    for (const file of Array.from(incoming).slice(0, room)) {
      next.push({
        id: fileId(),
        file,
        previewUrl: file.type === "application/pdf" ? "" : URL.createObjectURL(file),
      });
    }
    setError("");
    setStaged((prev) => [...prev, ...next]);
    if (inputRef.current) inputRef.current.value = "";
  }

  function removeFile(id: string) {
    setStaged((prev) => {
      const target = prev.find((s) => s.id === id);
      if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((s) => s.id !== id);
    });
  }

  function openVerify(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (staged.length === 0) {
      setError("Pilih minimal 1 foto Surat Jalan");
      return;
    }
    if (!gudang) {
      setError("Pilih gudang tujuan");
      return;
    }
    setVerifyOpen(true);
  }

  async function confirmSubmit() {
    setVerifyOpen(false);
    setLoading(true);
    setError("");
    setResult(null);
    setProgress(`Memproses ${staged.length} file…`);
    const form = new FormData();
    staged.forEach((s) => form.append("files", s.file));
    form.append("gudang", gudang);
    form.append("notes", notes);
    form.append("vehicleInfo", vehicleInfo);
    const uploadUrl = sheetOnly ? "/api/supplier/upload-sheet-only" : "/api/supplier/upload";
    const res = await fetch(uploadUrl, { method: "POST", body: form });
    const data = await res.json();
    setLoading(false);
    setProgress("");
    if (!res.ok) {
      setError(data.error ?? "Upload gagal");
      return;
    }
    setResult(data);
    revokeAll(staged);
    setStaged([]);
    setNotes("");
    setVehicleInfo("");
    setGudang("");
  }

  return (
    <>
      <form onSubmit={openVerify} className="space-y-6">
        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Foto Surat Jalan</h2>
              <p className="mt-1 text-sm text-slate-500">
                JPG, PNG, atau PDF — {SUPPLIER_MAX_SJ_FILES} file per pengiriman (1 file = 1 SJ).
              </p>
            </div>
            <button
              type="button"
              disabled={staged.length >= SUPPLIER_MAX_SJ_FILES}
              onClick={() => inputRef.current?.click()}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ImagePlus className="h-4 w-4" aria-hidden />
              Upload foto
            </button>
            <input
              ref={inputRef}
              type="file"
              accept={ACCEPT}
              multiple
              className="hidden"
              onChange={(e) => addFiles(e.target.files)}
            />
          </div>

          {staged.length > 0 ? (
            <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {staged.map((item, index) => (
                <li
                  key={item.id}
                  className="relative overflow-hidden rounded-lg border border-slate-200 bg-slate-50"
                >
                  <div className="flex items-center justify-between border-b border-slate-200 bg-white px-3 py-2">
                    <span className="text-xs font-medium text-slate-700">
                      SJ #{index + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeFile(item.id)}
                      className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-red-600 hover:bg-red-50"
                      aria-label={`Hapus file ${item.file.name}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Hapus
                    </button>
                  </div>
                  {item.previewUrl ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={item.previewUrl}
                      alt={item.file.name}
                      className="h-40 w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-40 items-center justify-center bg-slate-100 text-sm text-slate-600">
                      PDF — {item.file.name}
                    </div>
                  )}
                  <p className="truncate px-3 py-2 text-xs text-slate-500" title={item.file.name}>
                    {item.file.name}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <div
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
              onClick={() => inputRef.current?.click()}
              className="mt-6 cursor-pointer rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 px-6 py-14 text-center transition hover:border-blue-300 hover:bg-blue-50/40"
            >
              <ImagePlus className="mx-auto h-10 w-10 text-slate-400" aria-hidden />
              <p className="mt-3 text-sm font-medium text-slate-700">Klik untuk pilih foto Surat Jalan</p>
              <p className="mt-1 text-xs text-slate-500">atau gunakan tombol Upload foto</p>
            </div>
          )}
          <p className="mt-3 text-xs text-slate-500">
            Terpilih: <strong>{staged.length}</strong> / {SUPPLIER_MAX_SJ_FILES}
          </p>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-base font-semibold text-slate-900">Detail pengiriman</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="block sm:col-span-2">
              <span className="text-sm font-medium text-slate-700">
                Gudang tujuan <span className="text-red-500">*</span>
              </span>
              <select
                required
                value={gudang}
                onChange={(e) => setGudang(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="">— Pilih gudang —</option>
                {SUPPLIER_GUDANG_OPTIONS.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Kendaraan / Driver (opsional)</span>
              <input
                value={vehicleInfo}
                onChange={(e) => setVehicleInfo(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                placeholder="Plat nomor / nama sopir"
              />
            </label>
            <label className="block sm:col-span-2">
              <span className="text-sm font-medium text-slate-700">Catatan (opsional)</span>
              <textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                placeholder="Info tambahan untuk tim GBC"
              />
            </label>
          </div>
        </section>

        {error && (
          <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>
        )}
        {progress && <p className="text-sm text-blue-700">{progress}</p>}

        {result && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-sm text-emerald-900">
            <p className="font-semibold">Berhasil dikirim</p>
            {result.message && <p className="mt-1">{result.message}</p>}
            {result.gudang && <p>Gudang: {result.gudang}</p>}
            {result.fileCount != null && <p>Jumlah SJ: {result.fileCount}</p>}
            {result.submissionRef && <p>Referensi: {result.submissionRef}</p>}
            {result.sheetRowCount != null && <p>Total baris sheet: {result.sheetRowCount}</p>}
            {result.uploads && result.uploads.length > 1 && (
              <ul className="mt-2 list-inside list-disc text-emerald-800">
                {result.uploads.map((u) => (
                  <li key={u.submissionRef}>
                    {u.suratJalanNumber || u.submissionRef} ({u.sheetRowCount} baris)
                  </li>
                ))}
              </ul>
            )}
            {result.sheetUrl && (
              <p className="mt-2">
                <a href={result.sheetUrl} className="font-medium text-blue-700 underline" target="_blank" rel="noreferrer">
                  Buka spreadsheet hasil OCR
                </a>
              </p>
            )}
            {result.driveWarning && <p className="mt-2 text-amber-800">{result.driveWarning}</p>}
          </div>
        )}

        <button
          type="submit"
          disabled={loading || staged.length === 0}
          className="w-full rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 sm:w-auto sm:min-w-[220px]"
        >
          {loading ? "Mengupload…" : "Verifikasi & kirim"}
        </button>
      </form>

      {verifyOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-slate-200 bg-white p-6 shadow-xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="verify-title"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="verify-title" className="text-lg font-semibold text-slate-900">
                  Verifikasi sebelum kirim
                </h2>
                <p className="mt-1 text-sm text-slate-500">Pastikan data berikut sudah benar.</p>
              </div>
              <button
                type="button"
                onClick={() => setVerifyOpen(false)}
                className="rounded-lg p-1 text-slate-500 hover:bg-slate-100"
                aria-label="Tutup"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <dl className="mt-6 space-y-3 text-sm">
              <div className="flex justify-between gap-4 border-b border-slate-100 pb-2">
                <dt className="text-slate-500">Jumlah Surat Jalan</dt>
                <dd className="font-medium text-slate-900">{staged.length} file</dd>
              </div>
              <div className="flex justify-between gap-4 border-b border-slate-100 pb-2">
                <dt className="text-slate-500">Gudang tujuan</dt>
                <dd className="font-medium text-slate-900">{gudang}</dd>
              </div>
              {vehicleInfo && (
                <div className="flex justify-between gap-4 border-b border-slate-100 pb-2">
                  <dt className="text-slate-500">Kendaraan</dt>
                  <dd className="text-right text-slate-900">{vehicleInfo}</dd>
                </div>
              )}
              {notes && (
                <div className="border-b border-slate-100 pb-2">
                  <dt className="text-slate-500">Catatan</dt>
                  <dd className="mt-1 text-slate-900">{notes}</dd>
                </div>
              )}
            </dl>

            <ul className="mt-4 max-h-40 space-y-1 overflow-y-auto rounded-lg bg-slate-50 p-3 text-xs text-slate-700">
              {staged.map((s, i) => (
                <li key={s.id} className="truncate">
                  {i + 1}. {s.file.name}
                </li>
              ))}
            </ul>

            <p className="mt-4 text-xs text-amber-800">
              Setelah dikonfirmasi, setiap file akan diproses OCR dan ditulis ke spreadsheet GBC.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => void confirmSubmit()}
                className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
              >
                Ya, kirim sekarang
              </button>
              <button
                type="button"
                onClick={() => setVerifyOpen(false)}
                className="rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Kembali edit
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
