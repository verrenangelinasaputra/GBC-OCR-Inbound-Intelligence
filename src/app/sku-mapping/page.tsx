import { ModuleListPage } from "@/components/layout/module-list-page";
import { SpreadsheetModePage, spreadsheetModeActive } from "@/components/layout/spreadsheet-mode-page";
import { SkuMappingSelesaiTable } from "@/components/sku-mapping/sku-mapping-selesai-table";
import { getSession } from "@/lib/auth/session";
import { getInternalUserProfile } from "@/lib/internal-auth/profile";
import { prisma } from "@/lib/db";
import { listSelesaiSkuMappingLines } from "@/lib/services/ocr-sheet-sku-mapping";
import { getGoogleExportConfigOptional } from "@/lib/providers/google-workspace/config";
import Link from "next/link";

export default async function SkuMappingPage() {
  if (spreadsheetModeActive()) {
    if (!getGoogleExportConfigOptional()) {
      return <SpreadsheetModePage title="Product SKU Mapping" />;
    }

    let rows: Awaited<ReturnType<typeof listSelesaiSkuMappingLines>> = [];
    try {
      const session = await getSession();
      const profile = session ? await getInternalUserProfile(session.username) : null;
      const gudangFilter = profile?.gudangList.length ? profile.gudangList : undefined;
      rows = await listSelesaiSkuMappingLines(gudangFilter);
    } catch {
      return <SpreadsheetModePage title="Product SKU Mapping" />;
    }

    const docCount = new Set(rows.map((r) => r.docKey)).size;

    return (
      <ModuleListPage
        title="Product SKU Mapping"
        description="Baris item dari Surat Jalan yang sudah selesai ditinjau & dikonfirmasi supplier — siap dipetakan ke SKU internal GBC."
      >
        <p className="mb-4 text-sm text-slate-600">
          Menampilkan <strong>{rows.length}</strong> baris item dari{" "}
          <strong>{docCount}</strong> Surat Jalan (status tinjauan{" "}
          <strong>Selesai</strong>). Sumber data: spreadsheet OCR — sama dengan alur di{" "}
          <Link href="/ocr-review?status=SELESAI" className="text-blue-600 hover:underline">
            Tinjauan Surat Jalan
          </Link>
          .
        </p>
        <SkuMappingSelesaiTable rows={rows} />
      </ModuleListPage>
    );
  }

  const [pendingLines, mappings] = await Promise.all([
    prisma.ocrLineItem.findMany({
      where: { mappingStatus: { in: ["PENDING", "NEEDS_REVIEW"] } },
      include: { document: { include: { supplier: true } } },
      take: 30,
    }),
    prisma.supplierProductMapping.findMany({
      include: { supplier: true, internalProduct: true },
      orderBy: { updatedAt: "desc" },
      take: 30,
    }),
  ]);

  return (
    <ModuleListPage title="Product SKU Mapping" description="Engine mapping nama supplier → SKU internal GBC.">
      <h2 className="mb-2 font-medium">Review queue — unmatched lines</h2>
      <ul className="mb-8 space-y-2 text-sm">
        {pendingLines.map((l) => (
          <li key={l.id} className="rounded border bg-white p-3">
            {l.supplierProductName} — {l.document.supplier.name}{" "}
            <Link href={`/surat-jalan/${l.documentId}`} className="text-blue-600">
              Review doc
            </Link>
          </li>
        ))}
      </ul>
      <h2 className="mb-2 font-medium">Master mappings</h2>
      <table className="min-w-full text-sm border rounded-lg overflow-hidden bg-white">
        <thead className="bg-slate-50 text-left">
          <tr>
            <th className="px-3 py-2">Supplier</th>
            <th className="px-3 py-2">Nama supplier</th>
            <th className="px-3 py-2">SKU internal</th>
            <th className="px-3 py-2">Status</th>
          </tr>
        </thead>
        <tbody>
          {mappings.map((m) => (
            <tr key={m.id} className="border-t">
              <td className="px-3 py-2">{m.supplier.code}</td>
              <td className="px-3 py-2">{m.supplierProductName}</td>
              <td className="px-3 py-2">{m.internalProduct.sku}</td>
              <td className="px-3 py-2">{m.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </ModuleListPage>
  );
}
