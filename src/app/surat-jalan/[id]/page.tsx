import { AppShell } from "@/components/layout/app-shell";
import { prisma } from "@/lib/db";
import { OcrReviewPanel } from "@/components/documents/ocr-review-panel";
import { StatusBadge } from "@/components/ui/status-badge";
import Link from "next/link";
import { OcrJobTracker } from "@/components/documents/ocr-job-tracker";
import { GoogleExportButton } from "@/components/documents/google-export-button";

export default async function SuratJalanDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const doc = await prisma.suratJalanDocument.findUniqueOrThrow({
    where: { id },
    include: {
      supplier: true,
      lineItems: { include: { internalProduct: true }, orderBy: { lineNumber: "asc" } },
      ocrJobs: { orderBy: { createdAt: "desc" }, take: 5 },
      statusHistory: { orderBy: { createdAt: "desc" }, take: 8 },
    },
  });
  const latestJob = doc.ocrJobs[0];
  const latestCompleted = doc.ocrJobs.find((j) => j.status === "COMPLETED");
  const failedJob =
    latestJob?.status === "FAILED" && doc.lineItems.length === 0 ? latestJob : null;
  const isDemo = (latestCompleted?.structuredOutput as { isDemo?: boolean } | null)?.isDemo;
  const ocrInFlight =
    latestJob?.status === "PENDING" || latestJob?.status === "PROCESSING";
  return (
    <AppShell title={`Surat Jalan — ${doc.submissionRef}`}>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <StatusBadge label={doc.status.replace(/_/g, " ")} tone="info" />
        {isDemo && <StatusBadge label="DEMO OCR — wajib verifikasi" tone="warning" />}
        {latestCompleted && !isDemo && (
          <StatusBadge label={`OCR OK — ${latestCompleted.providerKey}`} tone="success" />
        )}
        {doc.googleSheetExportedAt && (
          <StatusBadge label="Google Sheet + Drive" tone="success" />
        )}
        {doc.googleExportLastError && (
          <div className="w-full rounded-lg border border-amber-200 bg-amber-50 p-2 text-xs text-amber-900">
            Export Google gagal: {doc.googleExportLastError}
          </div>
        )}
        {doc.googleDriveFileUrl && (
          <a
            href={doc.googleDriveFileUrl}
            target="_blank"
            rel="noreferrer"
            className="text-sm text-blue-600 hover:underline"
          >
            Buka file di Drive
          </a>
        )}
        {failedJob?.errorMessage && (
          <div className="w-full rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            <p className="font-medium">OCR Gemini gagal (job terbaru)</p>
            <p className="mt-1 whitespace-pre-wrap text-xs">{failedJob.errorMessage}</p>
            <p className="mt-2 text-xs">
              Pastikan GEMINI_MODEL memakai model dari <code className="text-red-900">npm run gemini:models</code>{" "}
              (mis. gemini-3.5-flash). Restart server → Retry OCR.
            </p>
          </div>
        )}
        <Link
          href={`/api/documents/${doc.id}/purchase-order`}
          className="hidden"
        >
          {/* actions via forms below */}
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="font-medium">Image Viewer</h2>
          <p className="text-xs text-slate-500">Zoom/pan — halaman 1 (multi-page: ganti ?page=)</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/api/documents/${doc.id}/image?page=1`}
            alt="Surat Jalan"
            className="mt-3 max-h-[70vh] w-full rounded-lg border object-contain bg-slate-100"
          />
        </section>
        <section className="rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="font-medium">OCR Review</h2>
          <OcrReviewPanel
            documentId={doc.id}
            header={{
              "No. Surat Jalan": doc.suratJalanNumber,
              Tanggal: doc.documentDate?.toISOString().slice(0, 10) ?? null,
              Supplier: doc.supplier.name,
              Tujuan: doc.destinationText,
              "Ref PO": doc.poReference,
            }}
          />
          <div className="mt-4 flex flex-wrap items-start gap-2">
            <OcrJobTracker documentId={doc.id} initiallyRunning={ocrInFlight} />
            <GoogleExportButton
              documentId={doc.id}
              exportedAt={doc.googleSheetExportedAt?.toISOString() ?? null}
              lastError={doc.googleExportLastError}
            />
            <form action={`/api/documents/${doc.id}/purchase-order`} method="post">
              <button
                type="submit"
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
              >
                Prepare PP (Pesanan Pembelian)
              </button>
            </form>
          </div>
        </section>
      </div>

      <section className="mt-8 rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="font-medium">Document history</h2>
        <ul className="mt-3 space-y-2 text-sm">
          {doc.statusHistory.map((h) => (
            <li key={h.id} className="flex justify-between border-b py-2 text-slate-600">
              <span>
                {h.previousStatus ?? "—"} → {h.newStatus}
              </span>
              <span>{h.createdAt.toLocaleString("id-ID")}</span>
            </li>
          ))}
        </ul>
      </section>
    </AppShell>
  );
}
