import { SUPPLIER_MASTER_ROLE } from "@/lib/supplier-auth/master-admin";
import { resolveSupplierCompanyName } from "@/lib/supplier-auth/resolve-company";
import { getOcrSheetDocumentDetail } from "@/lib/services/ocr-sheet-detail";

export async function assertSupplierCanAccessDocKey(params: {
  username: string;
  roles: string[];
  docKey: string;
}): Promise<void> {
  if (params.roles.includes(SUPPLIER_MASTER_ROLE)) return;

  const doc = await getOcrSheetDocumentDetail(params.docKey);
  const company = (await resolveSupplierCompanyName(params.username)).trim().toLowerCase();
  const user = params.username.trim().toLowerCase();
  const s = doc.supplier.trim().toLowerCase();
  const ok =
    s === company ||
    s === user ||
    (company.length >= 2 && s.includes(company)) ||
    (user.length >= 2 && s.includes(user));
  if (!ok) throw new Error("FORBIDDEN");
}
