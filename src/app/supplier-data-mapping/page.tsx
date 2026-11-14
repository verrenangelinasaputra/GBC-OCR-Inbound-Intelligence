import { ModuleListPage } from "@/components/layout/module-list-page";
import { SpreadsheetModePage, spreadsheetModeActive } from "@/components/layout/spreadsheet-mode-page";
import { SupplierDataMappingPanel } from "@/components/supplier-data-mapping/supplier-data-mapping-panel";
import { getSession } from "@/lib/auth/session";
import { getSupplierMasterDataSheetId } from "@/lib/config/supplier-master-data-sheet";
import { hasPermission } from "@/lib/rbac/permissions";

export default async function SupplierDataMappingPage() {
  if (!spreadsheetModeActive()) {
    return <SpreadsheetModePage title="Mapping Data Supplier" />;
  }

  const session = await getSession();
  const canView = session
    ? hasPermission(session.roles, "supplier_data_mapping", "VIEW", session.allowedModules)
    : false;
  if (!canView) {
    return (
      <ModuleListPage
        title="Mapping Data Supplier"
        description="Kode supplier & alias nama untuk struktur folder Drive."
      >
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Anda tidak punya akses modul <strong>Mapping Data Supplier</strong>. Minta Super Admin mencentang halaman
          ini di User &amp; Role Management.
        </p>
      </ModuleListPage>
    );
  }

  const canEdit =
    hasPermission(session!.roles, "supplier_data_mapping", "CREATE", session!.allowedModules) ||
    hasPermission(session!.roles, "supplier_data_mapping", "EDIT", session!.allowedModules);
  const isSuperAdmin = session!.roles.includes("SUPER_ADMIN");

  return (
    <ModuleListPage
      title="Mapping Data Supplier"
      description="Petakan nama supplier (alias) ke kode — mengatur folder Drive Gudang / Kode - Nama kanonik."
    >
      <p className="mb-4 text-sm text-slate-600">
        Data disimpan di spreadsheet{" "}
        <a
          href={`https://docs.google.com/spreadsheets/d/${getSupplierMasterDataSheetId()}/edit`}
          target="_blank"
          rel="noreferrer"
          className="text-blue-600 hover:underline"
        >
          [OCR] Master Data Supplier
        </a>
        . Service account perlu akses <strong>Editor</strong> pada spreadsheet tersebut.
      </p>
      <SupplierDataMappingPanel canEdit={canEdit} isSuperAdmin={isSuperAdmin} />
    </ModuleListPage>
  );
}
