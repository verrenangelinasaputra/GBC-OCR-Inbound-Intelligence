import { ModuleListPage } from "@/components/layout/module-list-page";
import { SpreadsheetModePage, spreadsheetModeActive } from "@/components/layout/spreadsheet-mode-page";
import { MasterMappingWorkspace } from "@/components/master-mapping/master-mapping-workspace";
import { getSkuMasterSheetId } from "@/lib/config/sku-mapping-sheets";
import { getSession } from "@/lib/auth/session";
import { hasPermission } from "@/lib/rbac/permissions";
import Link from "next/link";

type SearchParams = { ocr?: string };

export default async function MasterMappingPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const query = await searchParams;
  const initialOcr = String(query.ocr ?? "").trim();

  if (!spreadsheetModeActive()) {
    return <SpreadsheetModePage title="Generator SKU" />;
  }

  const session = await getSession();
  const canView = session
    ? hasPermission(session.roles, "master_mapping", "VIEW", session.allowedModules)
    : false;
  if (!canView) {
    return (
      <ModuleListPage title="Generator SKU" description="Generator master SKU dan alias nama OCR.">
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Anda tidak punya akses modul <strong>Generator SKU</strong>. Minta Super Admin mencentang halaman ini di User
          &amp; Role Management.
        </p>
      </ModuleListPage>
    );
  }

  const canEdit =
    hasPermission(session!.roles, "master_mapping", "CREATE", session!.allowedModules) ||
    hasPermission(session!.roles, "master_mapping", "EDIT", session!.allowedModules);

  return (
    <ModuleListPage
      title="Generator SKU"
      description="Master SKU (TABEL → REKAP SKUL/SKUS) dan alias nama OCR untuk SKU Mapping."
    >
      <p className="mb-4 text-sm text-slate-600">
        Generator SKU menulis ke tab kategori lalu <strong>REKAP SKUL</strong> / <strong>REKAP SKUS</strong> pada{" "}
        <a
          href={`https://docs.google.com/spreadsheets/d/${getSkuMasterSheetId()}/edit`}
          target="_blank"
          rel="noreferrer"
          className="text-blue-600 hover:underline"
        >
          spreadsheet master v2
        </a>
        . Alias OCR tetap di tab <strong>Master Mapping</strong> pada spreadsheet yang sama. Service account perlu{" "}
        <strong>Editor</strong>. <Link href="/sku-mapping" className="text-blue-600 hover:underline">SKU Mapping</Link> membaca{" "}
        <strong>REKAP SKUL</strong> dari file yang sama (env <code className="text-xs">SKU_MASTER_SHEET_ID</code> /{" "}
        <code className="text-xs">SKU_REKAP_SHEET_ID</code>).
      </p>
      <MasterMappingWorkspace canEdit={canEdit} initialOcrName={initialOcr} />
    </ModuleListPage>
  );
}
