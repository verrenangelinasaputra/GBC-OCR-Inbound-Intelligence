import { getSession } from "@/lib/auth/session";
import { getGoogleExportConfigOptional } from "@/lib/providers/google-workspace";
import { SUPPLIER_MASTER_ROLE } from "@/lib/supplier-auth/master-admin";
import { resolveSupplierCompanyName } from "@/lib/supplier-auth/resolve-company";
import {
  filterRowsForSupplier,
  listOcrSheetSubmissionRows,
} from "@/lib/services/ocr-sheet-submissions";
import { SupplierSubmissionsHistory } from "@/components/supplier/supplier-submissions-history";
import { redirect } from "next/navigation";

export default async function SupplierSubmissionsPage() {
  const session = await getSession();
  if (!session?.username) redirect("/supplier/login");

  const config = getGoogleExportConfigOptional();
  const sheetUrl = config
    ? `https://docs.google.com/spreadsheets/d/${config.sheetId}/edit`
    : null;

  let initialRows: Awaited<ReturnType<typeof listOcrSheetSubmissionRows>> = [];
  let loadError: string | null = null;

  if (config) {
    try {
      const all = await listOcrSheetSubmissionRows();
      const isMaster = session.roles.includes(SUPPLIER_MASTER_ROLE);
      if (isMaster) {
        initialRows = all;
      } else {
        const company = await resolveSupplierCompanyName(session.username);
        initialRows = filterRowsForSupplier(all, company, session.username);
      }
    } catch (e) {
      loadError = e instanceof Error ? e.message : "Gagal membaca spreadsheet.";
    }
  } else {
    loadError = "Google Sheet belum dikonfigurasi di server (GOOGLE_*).";
  }

  const isMaster = session.roles.includes(SUPPLIER_MASTER_ROLE);
  const companyLabel = isMaster
    ? "Semua supplier"
    : await resolveSupplierCompanyName(session.username);

  if (loadError && initialRows.length === 0) {
    return (
      <div>
        <h1 className="text-2xl font-semibold">Status Pengiriman</h1>
        <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {loadError}
        </p>
      </div>
    );
  }

  return (
    <SupplierSubmissionsHistory
      initialRows={initialRows}
      sheetUrl={sheetUrl}
      companyLabel={companyLabel}
      isMaster={isMaster}
    />
  );
}
