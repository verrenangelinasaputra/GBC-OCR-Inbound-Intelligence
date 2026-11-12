import { Suspense } from "react";
import { ModuleListPage } from "@/components/layout/module-list-page";
import { SpreadsheetModePage, spreadsheetModeActive } from "@/components/layout/spreadsheet-mode-page";
import { OcrReviewQueueTable } from "@/components/ocr-review/ocr-review-queue-table";
import { OcrReviewFilterBar } from "@/components/ocr-review/ocr-review-filter-bar";
import { getSession } from "@/lib/auth/session";
import { getInternalUserProfile } from "@/lib/internal-auth/profile";
import { prisma } from "@/lib/db";
import { listOcrDocumentsFromSheet } from "@/lib/services/ocr-sheet-list";
import { parseDashboardBucketFilter } from "@/lib/ocr-review/dashboard-bucket";
import {
  filterOcrReviewDocs,
  parseMonthFilter,
  parseOcrReviewSort,
  parseYearFilter,
} from "@/lib/ocr-review/list-filters";
import { collectDistinctSjYears } from "@/lib/surat-jalan/tanggal-sj";
import Link from "next/link";
import { StatusBadge } from "@/components/ui/status-badge";

type SearchParams = { gudang?: string; status?: string; year?: string; month?: string; sort?: string };

export default async function OcrReviewPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const query = await searchParams;
  const gudangFilterParam = query.gudang?.trim();
  const statusBucket = parseDashboardBucketFilter(query.status);
  const yearFilter = parseYearFilter(query.year);
  const monthFilter = parseMonthFilter(query.month);
  const sortMode = parseOcrReviewSort(query.sort);

  if (spreadsheetModeActive()) {
    let docs: Awaited<ReturnType<typeof listOcrDocumentsFromSheet>> = [];
    try {
      const session = await getSession();
      const profile = session ? await getInternalUserProfile(session.username) : null;
      const gudangFilter = profile?.gudangList.length ? profile.gudangList : undefined;
      docs = await listOcrDocumentsFromSheet(500, gudangFilter);
    } catch {
      return <SpreadsheetModePage title="Tinjauan Surat Jalan" />;
    }

    const years = collectDistinctSjYears(docs.map((d) => d.tanggal));
    const filtered = filterOcrReviewDocs(docs, {
      gudang: gudangFilterParam,
      status: statusBucket,
      year: yearFilter,
      month: monthFilter,
    });

    return (
      <ModuleListPage
        title="Tinjauan Surat Jalan"
        description="Daftar upload supplier — filter sesuai gudang di profil Anda. Buka detail untuk meninjau dan verifikasi."
      >
        <Suspense
          fallback={
            <div className="mb-4 h-20 animate-pulse rounded-xl border border-slate-200 bg-slate-50" />
          }
        >
          <OcrReviewFilterBar
            years={years}
            gudang={gudangFilterParam}
            status={statusBucket ?? undefined}
            year={yearFilter}
            month={monthFilter}
          />
        </Suspense>
        <OcrReviewQueueTable docs={filtered} initialSort={sortMode} />
      </ModuleListPage>
    );
  }

  const docs = await prisma.suratJalanDocument.findMany({
    where: { status: { in: ["NEEDS_REVIEW", "OCR_COMPLETED", "PROCESSING"] } },
    include: { supplier: true, ocrJobs: { take: 1, orderBy: { createdAt: "desc" } } },
    orderBy: { updatedAt: "desc" },
  });
  return (
    <ModuleListPage title="OCR Review Queue" description="Koreksi hasil OCR — raw output tetap tersimpan terpisah.">
      <ul className="space-y-3">
        {docs.map((d) => {
          const demo = (d.ocrJobs[0]?.structuredOutput as { isDemo?: boolean } | null)?.isDemo;
          return (
            <li key={d.id} className="flex items-center justify-between rounded-lg border bg-white p-4">
              <div>
                <p className="font-medium">{d.submissionRef}</p>
                <p className="text-sm text-slate-500">{d.supplier.name}</p>
                {demo && <StatusBadge label="DEMO OCR" tone="warning" />}
              </div>
              <Link href={`/surat-jalan/${d.id}`} className="text-blue-600 hover:underline">
                Open review
              </Link>
            </li>
          );
        })}
        {docs.length === 0 && <p className="text-slate-500">Queue kosong.</p>}
      </ul>
    </ModuleListPage>
  );
}
