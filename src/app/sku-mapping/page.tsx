import { ModuleListPage } from "@/components/layout/module-list-page";
import { spreadsheetModeActive } from "@/components/layout/spreadsheet-mode-page";
import { SkuMappingWorkbench } from "@/components/sku-mapping/sku-mapping-workbench";
import { getSession } from "@/lib/auth/session";
import { getInternalUserProfile } from "@/lib/internal-auth/profile";
import { hasPermission } from "@/lib/rbac/permissions";
import { prisma } from "@/lib/db";
import { buildSkuMappingWorkbench } from "@/lib/services/ocr-sheet-sku-mapping";
import { getGoogleExportConfigOptional } from "@/lib/providers/google-workspace/config";
import {
  DBM_INBOUND_SHEET_ID,
  getDbmInboundTabName,
  getSkuRekapSheetId,
  getSkuRekapTabName,
} from "@/lib/config/sku-mapping-sheets";
import Link from "next/link";

export default async function SkuMappingPage() {
  if (spreadsheetModeActive()) {
    if (!getGoogleExportConfigOptional()) {
      return (
        <ModuleListPage
          title="Product SKU Mapping"
          description="Mode spreadsheet — butuh konfigurasi Google export."
        >
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
            Google export belum aktif. Pastikan di Vercel: <code>SHEET_ONLY_MODE=true</code>,{" "}
            <code>GOOGLE_SHEET_ID</code>, <code>GOOGLE_DRIVE_FOLDER_ID</code>, dan{" "}
            <code>GOOGLE_SERVICE_ACCOUNT_JSON</code> (atau file kredensial).
          </p>
        </ModuleListPage>
      );
    }

    let workbench: Awaited<ReturnType<typeof buildSkuMappingWorkbench>> = [];
    let catalogSize = 0;
    let loadError: string | null = null;
    try {
      const session = await getSession();
      const profile = session ? await getInternalUserProfile(session.username) : null;
      const gudangFilter = profile?.gudangList.length ? profile.gudangList : undefined;
      workbench = await buildSkuMappingWorkbench(gudangFilter);
      const { loadSkuRekapCatalog } = await import("@/lib/services/sku-rekap-catalog");
      catalogSize = (await loadSkuRekapCatalog()).length;
    } catch (e) {
      loadError =
        e instanceof Error
          ? e.message
          : "Gagal membaca spreadsheet OCR / REKAP SKUL. Cek share Editor ke service account.";
    }

    if (loadError) {
      return (
        <ModuleListPage title="Product SKU Mapping" description="Gagal memuat data mapping.">
          <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
            {loadError}
          </p>
          <p className="mt-3 text-sm text-slate-600">
            Share spreadsheet{" "}
            <a
              href={`https://docs.google.com/spreadsheets/d/${getSkuRekapSheetId()}/edit`}
              className="text-blue-600 hover:underline"
            >
              REKAP SKUL
            </a>{" "}
            dan sheet OCR ke email service account (Editor), lalu muat ulang halaman ini.
          </p>
        </ModuleListPage>
      );
    }

    const session = await getSession();
    const canFinalize = session
      ? hasPermission(session.roles, "sku_mapping", "APPROVE", session.allowedModules) ||
        hasPermission(session.roles, "sku_mapping", "EDIT", session.allowedModules)
      : false;

    const lineCount = workbench.length;

    return (
      <ModuleListPage
        title="Product SKU Mapping"
        description="Pemetaan nama barang OCR (SJ Selesai) ke master REKAP SKUL — konfirmasi menjadi Data Barang Masuk."
      >
        <p className="mb-4 text-sm text-slate-600">
          Sumber SJ:{" "}
          <a
            href="https://docs.google.com/spreadsheets/d/1o2No4lV_r1Hrfi3qiyKI0ZX-VUaQaZdcxCbo4qJ1LDc/edit"
            target="_blank"
            rel="noreferrer"
            className="text-blue-600 hover:underline"
          >
            spreadsheet OCR
          </a>{" "}
          (status <strong>Selesai</strong>). Master acuan:{" "}
          <a
            href={`https://docs.google.com/spreadsheets/d/${getSkuRekapSheetId()}/edit`}
            target="_blank"
            rel="noreferrer"
            className="text-blue-600 hover:underline"
          >
            REKAP SKUL
          </a>{" "}
          ({catalogSize.toLocaleString("id-ID")} produk, kolom <em>Nama Produk Acuan</em>). Final DBM → tab{" "}
          <strong>{getDbmInboundTabName()}</strong> pada{" "}
          <a
            href={`https://docs.google.com/spreadsheets/d/${DBM_INBOUND_SHEET_ID}/edit`}
            target="_blank"
            rel="noreferrer"
            className="text-blue-600 hover:underline"
          >
            spreadsheet DBM
          </a>
          . Antrean: <strong>{lineCount}</strong> baris. Lihat juga{" "}
          <Link href="/ocr-review?status=SELESAI" className="text-blue-600 hover:underline">
            SJ Selesai
          </Link>
          .
        </p>
        <SkuMappingWorkbench rows={workbench} canFinalize={canFinalize} />
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
