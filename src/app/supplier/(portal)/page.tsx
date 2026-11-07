"use client";

import { useEffect, useState } from "react";

export default function SupplierUploadPage() {
  const [sheetOnly, setSheetOnly] = useState(false);
  const [files, setFiles] = useState<FileList | null>(null);
  const [notes, setNotes] = useState("");
  const [vehicleInfo, setVehicleInfo] = useState("");
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [result, setResult] = useState<{
    submissionRef?: string;
    shipmentRef?: string;
    duplicateDetected?: boolean;
    ocrError?: string;
    sheetRowCount?: number;
    sheetUrl?: string;
    sheetTab?: string;
    sheetUpdatedRange?: string;
    driveFileUrl?: string;
    driveWarning?: string;
    message?: string;
  } | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/app-mode")
      .then((r) => r.json())
      .then((d) => setSheetOnly(Boolean(d.sheetOnly)))
      .catch(() => setSheetOnly(false));
  }, []);

  function onFilesChange(list: FileList | null) {
    setFiles(list);
    previewUrls.forEach((u) => URL.revokeObjectURL(u));
    if (!list) {
      setPreviewUrls([]);
      return;
    }
    setPreviewUrls(Array.from(list).map((f) => URL.createObjectURL(f)));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!files?.length) {
      setError("Pilih minimal 1 gambar Surat Jalan");
      return;
    }
    setLoading(true);
    setError("");
    const form = new FormData();
    Array.from(files).forEach((f) => form.append("files", f));
    form.append("notes", notes);
    form.append("vehicleInfo", vehicleInfo);
    const uploadUrl = sheetOnly ? "/api/supplier/upload-sheet-only" : "/api/supplier/upload";
    const res = await fetch(uploadUrl, { method: "POST", body: form });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "Upload gagal");
      return;
    }
    setResult({
      submissionRef: data.submissionRef,
      shipmentRef: data.shipmentRef,
      duplicateDetected: data.duplicateDetected,
      ocrError: data.ocrError,
      sheetRowCount: data.sheetRowCount,
      sheetUrl: data.sheetUrl,
      sheetTab: data.sheetTab,
      sheetUpdatedRange: data.sheetUpdatedRange,
      driveFileUrl: data.driveFileUrl,
      driveWarning: data.driveWarning,
      message: data.message,
    });
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold">Upload Surat Jalan</h1>
      <p className="mt-1 text-sm text-slate-400">
        JPG, JPEG, PNG, PDF (scan). Preview sebelum submit.
        {sheetOnly && " Mode spreadsheet: 1 file per submit → langsung ke Google Sheet."}
      </p>

      <form onSubmit={onSubmit} className="mt-6 space-y-4 rounded-xl border border-slate-700 bg-slate-800/50 p-6">
        <div>
          <label className="text-sm">File Surat Jalan (multi-page OK)</label>
          <input
            type="file"
            accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf"
            multiple
            className="mt-2 block w-full text-sm"
            onChange={(e) => onFilesChange(e.target.files)}
          />
        </div>
        {previewUrls.length > 0 && (
          <div className="flex flex-wrap gap-3">
            {previewUrls.map((url, i) => (
              <img key={url} src={url} alt={`Preview ${i + 1}`} className="h-32 rounded border border-slate-600 object-cover" />
            ))}
          </div>
        )}
        <div>
          <label className="text-sm">Catatan / Info pengiriman (opsional)</label>
          <textarea
            className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-sm"
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
        <div>
          <label className="text-sm">Kendaraan / Driver (opsional)</label>
          <input
            className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-sm"
            value={vehicleInfo}
            onChange={(e) => setVehicleInfo(e.target.value)}
          />
        </div>
        {error && <p className="text-sm text-red-400">{error}</p>}
        {result?.submissionRef && (
          <div className="rounded-lg bg-emerald-900/40 p-4 text-sm">
            <p className="font-medium text-emerald-300">Berhasil disubmit</p>
            <p>Referensi: {result.submissionRef}</p>
            {result.shipmentRef && <p>Shipment (NKB): {result.shipmentRef}</p>}
            {result.sheetRowCount != null && <p>Baris di Sheet: {result.sheetRowCount}</p>}
            {result.sheetUrl && (
              <p>
                <a href={result.sheetUrl} className="text-blue-300 underline" target="_blank" rel="noreferrer">
                  Buka spreadsheet hasil OCR
                </a>
                {result.sheetTab ? ` (tab ${result.sheetTab})` : ""}
              </p>
            )}
            {result.sheetUpdatedRange && (
              <p className="text-slate-400 text-xs">Range: {result.sheetUpdatedRange}</p>
            )}
            {result.driveFileUrl && (
              <p>
                <a href={result.driveFileUrl} className="text-blue-300 underline" target="_blank" rel="noreferrer">
                  Buka file di Drive
                </a>
              </p>
            )}
            {result.message && <p className="mt-1 text-slate-300">{result.message}</p>}
            {result.driveWarning && <p className="mt-2 text-amber-300">{result.driveWarning}</p>}
            {result.duplicateDetected && (
              <p className="mt-2 text-amber-300">Peringatan: kemungkinan duplikat file — tim GBC akan review.</p>
            )}
            {result.ocrError && (
              <p className="mt-2 text-amber-300">
                OCR: {result.ocrError} — file tersimpan; admin dapat retry setelah API key dikonfigurasi.
              </p>
            )}
          </div>
        )}
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium hover:bg-blue-600 disabled:opacity-50"
        >
          {loading ? "Mengupload..." : "Submit Surat Jalan"}
        </button>
      </form>
    </div>
  );
}
