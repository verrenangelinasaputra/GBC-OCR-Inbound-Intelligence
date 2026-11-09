import { getSession } from "@/lib/auth/session";
import { getGoogleExportConfigOptional } from "@/lib/providers/google-workspace";
import { SUPPLIER_MASTER_ROLE } from "@/lib/supplier-auth/master-admin";
import { resolveSupplierCompanyName } from "@/lib/supplier-auth/resolve-company";
import {
  filterRowsForSupplier,
  listOcrSheetSubmissionRows,
} from "@/lib/services/ocr-sheet-submissions";

export async function GET() {
  const session = await getSession();
  if (!session?.username) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const config = getGoogleExportConfigOptional();
  if (!config) {
    return Response.json({ error: "Google Sheet belum dikonfigurasi." }, { status: 503 });
  }

  try {
    const all = await listOcrSheetSubmissionRows();
    const isMaster = session.roles.includes(SUPPLIER_MASTER_ROLE);
    let rows = all;
    if (!isMaster) {
      const company = await resolveSupplierCompanyName(session.username);
      rows = filterRowsForSupplier(all, company, session.username);
    }
    return Response.json({
      rows,
      sheetId: config.sheetId,
      isMaster,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Gagal membaca spreadsheet.";
    return Response.json({ error: message }, { status: 500 });
  }
}
