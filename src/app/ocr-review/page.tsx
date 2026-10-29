import { ModuleListPage } from "@/components/layout/module-list-page";
import { prisma } from "@/lib/db";
import Link from "next/link";
import { StatusBadge } from "@/components/ui/status-badge";

export default async function OcrReviewPage() {
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
