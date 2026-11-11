"use client";

import { useCallback, useEffect, useState } from "react";
import type { OcrSheetDocumentDetail, OcrSheetLine } from "@/lib/services/ocr-sheet-detail";
import { ReviewStatusBadge } from "@/components/ocr-review/review-status-badge";
import { StatusBadge } from "@/components/ui/status-badge";
import Link from "next/link";

export function SheetOcrReviewPanel({
  docKey,
  initial,
}: {
  docKey: string;
  initial: OcrSheetDocumentDetail;
}) {
  const [doc, setDoc] = useState(initial);
  const [header, setHeader] = useState({
    tanggal: initial.tanggal,
    noSuratJalan: initial.noSuratJalan,
    noKendaraan: initial.noKendaraan,
    noPo: initial.noPo,
    namaPenerima: initial.namaPenerima,
    alamat: initial.alamat,
  });
  const [lines, setLines] = useState<OcrSheetLine[]>(initial.lines);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [imageError, setImageError] = useState("");
  const [revisionImageError, setRevisionImageError] = useState("");
  const [deciding, setDeciding] = useState(false);
  const [photoView, setPhotoView] = useState<"original" | number>("original");
  const [confirmRejectOpen, setConfirmRejectOpen] = useState(false);

  const revisionCount = doc.revisionLinks?.length ?? 0;

  const syncStateFromDoc = useCallback((updated: OcrSheetDocumentDetail) => {
    setDoc(updated);
    setLines(updated.lines);
    setHeader({
      tanggal: updated.tanggal,
      noSuratJalan: updated.noSuratJalan,
      noKendaraan: updated.noKendaraan,
      noPo: updated.noPo,
      namaPenerima: updated.namaPenerima,
      alamat: updated.alamat,
    });
  }, []);

  useEffect(() => {
    void fetch(`/api/ocr-sheet/documents/${docKey}`)
      .then((r) => r.json())
      .then((data: { doc?: OcrSheetDocumentDetail }) => {
        if (data.doc) syncStateFromDoc(data.doc);
      })
      .catch(() => null);
  }, [docKey, syncStateFromDoc]);

  async function submitDecision(decision: "approve" | "reject") {
    setDeciding(true);
    setError("");
    setMessage("");
    setConfirmRejectOpen(false);
    try {
      const res = await fetch(`/api/ocr-sheet/documents/${docKey}/decision`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          decision,
          header,
          lines: lines.map((l) => ({
            sheetRow: l.sheetRow,
            banyaknya: l.banyaknya,
            isi: l.isi,
            namaBarang: l.namaBarang,
            jumlah: l.jumlah,
            keterangan: l.keterangan,
            status: l.status,
          })),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Gagal memproses keputusan");
        return;
      }
      const detailRes = await fetch(`/api/ocr-sheet/documents/${docKey}`);
      const detailJson = await detailRes.json();
      if (detailJson.doc) {
        syncStateFromDoc(detailJson.doc);
      }
      if (decision === "approve") {
        setMessage("Disetujui — data tersimpan di spreadsheet, status Terverifikasi & Disetujui.");
      } else {
        const seq = typeof data.revisionSequence === "number" ? data.revisionSequence : revisionCount + 1;
        setPhotoView(seq - 1);
        setRevisionImageError("");
        const mirrorWarn =
          typeof data.supplierMirrorWarning === "string" && data.supplierMirrorWarning
            ? ` Peringatan mirror supplier: ${data.supplierMirrorWarning}`
            : "";
        setMessage(`Revisi ${seq} tersimpan — lihat tab Revisi.${mirrorWarn}`);
      }
    } catch {
      setError("Gagal verifikasi — cek koneksi.");
    } finally {
      setDeciding(false);
    }
  }

  function requestReject() {
    setConfirmRejectOpen(true);
  }

  function patchLine(sheetRow: number, patch: Partial<OcrSheetLine>) {
    setLines((prev) => prev.map((l) => (l.sheetRow === sheetRow ? { ...l, ...patch } : l)));
  }

  const imageSrc = `/api/ocr-sheet/documents/${docKey}/image`;
  const revisionSrc =
    typeof photoView === "number"
      ? `/api/ocr-sheet/documents/${docKey}/revision?index=${photoView}`
      : "";
  const isPdf = (doc.fileName || "").toLowerCase().endsWith(".pdf");
  const canShowOriginal = (doc.fileUrl || doc.fileName) && !imageError;
  const canShowRevision = revisionCount > 0 && typeof photoView === "number";

  const reportImageLoadError = useCallback(async () => {
    try {
      const res = await fetch(imageSrc, { credentials: "include" });
      if (res.status === 401) {
        setImageError("Sesi login habis — login ulang lalu buka halaman ini lagi.");
        return;
      }
      if (res.status === 403) {
        setImageError(
          "Akun tidak punya akses ocr_review — ubah kolom roles di spreadsheet Users (mis. DBM_OPERATOR) atau minta admin."
        );
        return;
      }
      const data = await res.json().catch(() => ({}));
      const apiMsg = typeof data.error === "string" ? data.error : "";
      setImageError(
        apiMsg ||
          "Foto tidak bisa dimuat — cek folder Drive dibagikan ke service account / OAuth, atau isi kolom Link Drive di spreadsheet."
      );
    } catch {
      setImageError(
        "Foto tidak bisa dimuat — cek koneksi atau akses Drive/OAuth di server (Vercel env)."
      );
    }
  }, [imageSrc]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <StatusBadge
          label={doc.lineStatus}
          tone={doc.lineStatus === "CEK" ? "warning" : "success"}
        />
        <ReviewStatusBadge status={doc.statusReview} />
        {revisionCount > 0 && (
          <span className="text-sm text-slate-600">
            {revisionCount} revisi
          </span>
        )}
        <span className="text-sm text-slate-500">
          {lines.length} baris item · diekspor {doc.exportTimestamp || "—"}
        </span>
        <Link href="/ocr-review" className="text-sm text-blue-600 hover:underline">
          ← Kembali ke queue
        </Link>
      </div>

      {message && <p className="text-sm text-green-700">{message}</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="font-medium">Foto Surat Jalan</h2>
          <p className="mt-1 text-xs text-slate-500">{doc.fileName || "—"}</p>
          <div className="mt-3 flex flex-wrap gap-2 border-b border-slate-100 pb-2">
            <button
              type="button"
              onClick={() => setPhotoView("original")}
              className={`rounded-md px-3 py-1.5 text-sm ${
                photoView === "original"
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              Foto asli
            </button>
            {revisionCount === 0 ? (
              <button
                type="button"
                disabled
                className="cursor-not-allowed rounded-md bg-slate-50 px-3 py-1.5 text-sm text-slate-400"
              >
                Revisi
              </button>
            ) : (
              Array.from({ length: revisionCount }, (_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    setPhotoView(i);
                    setRevisionImageError("");
                  }}
                  className={`rounded-md px-3 py-1.5 text-sm ${
                    photoView === i
                      ? "bg-amber-600 text-white"
                      : "bg-amber-50 text-amber-900 hover:bg-amber-100"
                  }`}
                >
                  Revisi {i + 1}
                </button>
              ))
            )}
          </div>
          {photoView === "original" ? (
            canShowOriginal ? (
              <>
                {isPdf ? (
                  <iframe
                    title={doc.fileName || "Surat Jalan PDF"}
                    src={imageSrc}
                    className="mt-3 h-[70vh] w-full rounded-lg border border-slate-200 bg-slate-100"
                  />
                ) : (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={imageSrc}
                    alt={doc.fileName || "Surat Jalan"}
                    className="mt-3 max-h-[70vh] w-full rounded-lg border border-slate-200 bg-slate-100 object-contain"
                    onError={() => void reportImageLoadError()}
                  />
                )}
                {doc.fileUrl && (
                  <a
                    href={doc.fileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-block text-sm text-blue-600 hover:underline"
                  >
                    Buka asli di Drive
                  </a>
                )}
              </>
            ) : (
              <p className="mt-3 text-sm text-amber-800">
                {imageError ||
                  "Belum ada nama file di sheet — upload ulang atau isi kolom Nama File."}
              </p>
            )
          ) : canShowRevision && !revisionImageError ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                key={revisionSrc}
                src={revisionSrc}
                alt={`Revisi ${photoView + 1}`}
                className="mt-3 max-h-[70vh] w-full rounded-lg border border-amber-200 bg-amber-50/30 object-contain"
                onError={() => setRevisionImageError("Gambar revisi tidak bisa dimuat dari Drive.")}
              />
              {doc.revisionLinks[photoView] && (
                <a
                  href={doc.revisionLinks[photoView]}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-block text-sm text-blue-600 hover:underline"
                >
                  Buka revisi {photoView + 1} di Drive
                </a>
              )}
            </>
          ) : (
            <p className="mt-3 text-sm text-amber-800">
              {revisionImageError || "Pilih tab Revisi untuk melihat gambar."}
            </p>
          )}
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="mb-3 font-medium">Header SJ</h2>
          <div className="grid gap-3 text-sm sm:grid-cols-2">
            {(
              [
                ["tanggal", "Tanggal SJ"],
                ["noSuratJalan", "No. Surat Jalan"],
                ["noKendaraan", "No. Kendaraan"],
                ["noPo", "No. PO"],
                ["namaPenerima", "Nama Penerima"],
                ["alamat", "Alamat"],
              ] as const
            ).map(([field, label]) => (
              <label key={field} className="block">
                <span className="text-xs text-slate-500">{label}</span>
                <input
                  className="mt-1 w-full rounded border border-slate-200 px-2 py-1.5"
                  value={header[field]}
                  onChange={(e) => setHeader((h) => ({ ...h, [field]: e.target.value }))}
                />
              </label>
            ))}
          </div>
        </section>
      </div>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-100 px-4 py-3">
          <h2 className="font-medium">Baris item (per baris di spreadsheet)</h2>
          <p className="text-xs text-slate-500">
            Edit lalu pilih Setujui atau Tidak sesuai — perubahan otomatis tersimpan ke spreadsheet.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-600">
              <tr>
                <th className="px-3 py-2">#</th>
                <th className="px-3 py-2">Nama Barang</th>
                <th className="px-3 py-2">Banyaknya</th>
                <th className="px-3 py-2">Isi</th>
                <th className="px-3 py-2">Jumlah</th>
                <th className="px-3 py-2">Keterangan</th>
                <th className="px-3 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((line, idx) => (
                <tr key={line.sheetRow} className="border-t">
                  <td className="px-3 py-2 text-slate-500">
                    {idx + 1}
                    <span className="block text-[10px]">baris {line.sheetRow}</span>
                  </td>
                  <td className="px-3 py-2">
                    <input
                      className="w-full min-w-[140px] rounded border px-1.5 py-1"
                      value={line.namaBarang}
                      onChange={(e) => patchLine(line.sheetRow, { namaBarang: e.target.value })}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      className="w-24 rounded border px-1.5 py-1"
                      value={line.banyaknya}
                      onChange={(e) => patchLine(line.sheetRow, { banyaknya: e.target.value })}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      className="w-24 rounded border px-1.5 py-1"
                      value={line.isi}
                      onChange={(e) => patchLine(line.sheetRow, { isi: e.target.value })}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      className="w-28 rounded border px-1.5 py-1"
                      value={line.jumlah}
                      onChange={(e) => patchLine(line.sheetRow, { jumlah: e.target.value })}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      className="w-full min-w-[120px] rounded border px-1.5 py-1"
                      value={line.keterangan}
                      onChange={(e) => patchLine(line.sheetRow, { keterangan: e.target.value })}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <select
                      className="rounded border px-1.5 py-1"
                      value={line.status}
                      onChange={(e) => patchLine(line.sheetRow, { status: e.target.value })}
                    >
                      <option value="OK">OK</option>
                      <option value="CEK">CEK</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          disabled={deciding}
          onClick={() => void submitDecision("approve")}
          className="rounded-lg bg-emerald-600 px-5 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          {deciding ? "Menyimpan & memproses…" : "Setujui (barang sesuai)"}
        </button>
        <button
          type="button"
          disabled={deciding}
          onClick={requestReject}
          className="rounded-lg border border-amber-400 bg-amber-50 px-5 py-2 text-sm font-medium text-amber-900 hover:bg-amber-100 disabled:opacity-50"
        >
          {deciding ? "Menyimpan & memproses…" : "Tidak sesuai → [REVISI]"}
        </button>
      </div>

      {confirmRejectOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-revisi-title"
        >
          <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-lg">
            <h3 id="confirm-revisi-title" className="text-lg font-medium text-slate-900">
              Konfirmasi revisi
            </h3>
            <p className="mt-2 text-sm text-slate-600">
              Data di form akan disimpan ke spreadsheet dan gambar{" "}
              <strong>Revisi {revisionCount + 1}</strong> akan dibuat serta diunggah ke Drive gudang
              {revisionCount > 0 ? " (dan mirror supplier jika diaktifkan)" : ""}. Lanjutkan?
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                onClick={() => setConfirmRejectOpen(false)}
                disabled={deciding}
              >
                Batal
              </button>
              <button
                type="button"
                className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50"
                onClick={() => void submitDecision("reject")}
                disabled={deciding}
              >
                {deciding ? "Memproses…" : "Ya, buat revisi"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
