import { ModuleListPage } from "@/components/layout/module-list-page";
import { SpreadsheetModePage, spreadsheetModeActive } from "@/components/layout/spreadsheet-mode-page";
import { MasterMappingPanel } from "@/components/master-mapping/master-mapping-panel";
import { getSession } from "@/lib/auth/session";
import { getSkuRekapSheetId } from "@/lib/config/sku-mapping-sheets";
import { hasPermission } from "@/lib/rbac/permissions";

type SearchParams = { ocr?: string };

export default async function MasterMappingPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const query = await searchParams;
  const initialOcr = String(query.ocr ?? "").trim();

  if (!spreadsheetModeActive()) {
    return <SpreadsheetModePage title="Mapping Produk" />;
  }

  const session = await getSession();
  const canView = session
    ? hasPermission(session.roles, "master_mapping", "VIEW", session.allowedModules)
    : false;
  if (!canView) {
    return (
      <ModuleListPage title="Mapping Produk" description="Kelola alias SKU untuk nama barang OCR.">
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Anda tidak punya akses modul <strong>Mapping Produk</strong>. Minta Super Admin mencentang halaman ini di User
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
      title="Mapping Produk"
      description="Petakan nama barang dari OCR ke SKU master — dipakai saat tidak ada match otomatis di REKAP SKUL."
    >
      <p className="mb-4 text-sm text-slate-600">
        Data disimpan di tab <strong>Master Mapping</strong> pada{" "}
        <a
          href={`https://docs.google.com/spreadsheets/d/${getSkuRekapSheetId()}/edit`}
          target="_blank"
          rel="noreferrer"
          className="text-blue-600 hover:underline"
        >
          spreadsheet REKAP SKUL
        </a>
        . Service account perlu Editor pada spreadsheet tersebut.
      </p>
      <MasterMappingPanel canEdit={canEdit} initialOcrName={initialOcr} />
    </ModuleListPage>
  );
}
