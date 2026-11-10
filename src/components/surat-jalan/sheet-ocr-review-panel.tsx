"use client";

import { useCallback, useState } from "react";
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
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [imageError, setImageError] = useState(false);
  const [deciding, setDeciding] = useState(false);

  const save = useCallback(async () => {
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const res = await fetch(`/api/ocr-sheet/documents/${docKey}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
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
        setError(typeof data.error === "string" ? data.error : "Gagal menyimpan");
        return;
      }
      const updated = data.doc as OcrSheetDocumentDetail;
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
      setMessage("Tersimpan — spreadsheet diperbarui.");
    } catch {
      setError("Gagal menyimpan — cek koneksi.");
    } finally {
      setSaving(false);
    }
  }, [docKey, header, lines]);

  async function decide(decision: "approve" | "reject") {
    setDeciding(true);
    setError("");
    setMessage("");
    try {
      if (decision === "reject") {
        await save();
      }
      const res = await fetch(`/api/ocr-sheet/documents/${docKey}/decision`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Gagal memproses keputusan");
        return;
      }
      const detailRes = await fetch(`/api/ocr-sheet/documents/${docKey}`);
      const detailJson = await detailRes.json();
      if (detailJson.doc) {
        setDoc(detailJson.doc);
        setLines(detailJson.doc.lines);
      }
      setMessage(
        decision === "approve"
          ? "Disetujui — status Terverifikasi & Disetujui."
          : `Tidak sesuai — gambar [REVISI] di Drive: ${data.revisionUrl ?? ""}`
      );
    } catch {
      setError("Gagal verifikasi — cek koneksi.");
    } finally {
      setDeciding(false);
    }
  }

  function patchLine(sheetRow: number, patch: Partial<OcrSheetLine>) {
    setLines((prev) => prev.map((l) => (l.sheetRow === sheetRow ? { ...l, ...patch } : l)));
  }

  const imageSrc = `/api/ocr-sheet/documents/${docKey}/image`;
  const isPdf = (doc.fileName || "").toLowerCase().endsWith(".pdf");
  const canShowMedia = (doc.fileUrl || doc.fileName) && !imageError;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <StatusBadge
          label={doc.lineStatus}
          tone={doc.lineStatus === "CEK" ? "warning" : "success"}
        />
        <ReviewStatusBadge status={doc.statusReview} />
        {doc.linkRevisi && (
          <a href={doc.linkRevisi} target="_blank" rel="noreferrer" className="text-sm text-blue-600 hover:underline">
            Lihat [REVISI]
          </a>
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
          {canShowMedia ? (
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
                  onError={() => setImageError(true)}
                />
              )}
              {doc.fileUrl && (
                <a
                  href={doc.fileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-block text-sm text-blue-600 hover:underline"
                >
                  Buka di Google Drive
                </a>
              )}
            </>
          ) : (
            <p className="mt-3 text-sm text-amber-800">
              {imageError
                ? "Foto tidak bisa dimuat — cek folder Drive dibagikan ke service account / OAuth, atau isi kolom Link Drive di spreadsheet."
                : "Belum ada nama file di sheet — upload ulang atau isi kolom Nama File."}
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
          <p className="text-xs text-slate-500">Edit lalu Simpan — setiap baris = satu produk di sheet.</p>
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
          disabled={saving || deciding}
          onClick={() => void save()}
          className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? "Menyimpan…" : "Simpan ke spreadsheet"}
        </button>
        <button
          type="button"
          disabled={saving || deciding}
          onClick={() => void decide("approve")}
          className="rounded-lg bg-emerald-600 px-5 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          {deciding ? "…" : "Setujui (barang sesuai)"}
        </button>
        <button
          type="button"
          disabled={saving || deciding}
          onClick={() => void decide("reject")}
          className="rounded-lg border border-amber-400 bg-amber-50 px-5 py-2 text-sm font-medium text-amber-900 hover:bg-amber-100 disabled:opacity-50"
        >
          {deciding ? "…" : "Tidak sesuai → [REVISI]"}
        </button>
      </div>
    </div>
  );
}
