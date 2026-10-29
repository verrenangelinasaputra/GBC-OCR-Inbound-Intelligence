"use client";

import { useState } from "react";

export default function SupplierUploadPage() {
  const [files, setFiles] = useState<FileList | null>(null);
  const [notes, setNotes] = useState("");
  const [vehicleInfo, setVehicleInfo] = useState("");
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [result, setResult] = useState<{
    submissionRef?: string;
    shipmentRef?: string;
    duplicateDetected?: boolean;
    ocrError?: string;
  } | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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
    const res = await fetch("/api/supplier/upload", { method: "POST", body: form });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "Upload gagal");
      return;
    }
    setResult(data);
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold">Upload Surat Jalan</h1>
      <p className="mt-1 text-sm text-slate-400">
        JPG, JPEG, PNG, PDF (scan). Preview sebelum submit.
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
            <p>Shipment (NKB): {result.shipmentRef}</p>
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
