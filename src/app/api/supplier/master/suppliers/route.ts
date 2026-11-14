import { jsonError } from "@/lib/api/auth-context";
import { listAllSupplierAccounts } from "@/lib/supplier-auth/directory";
import { supplierAuthStatus } from "@/lib/supplier-auth/errors";
import { requireSupplierMasterSession } from "@/lib/supplier-auth/require-master";
import { listSupplierAccountsWithDrive } from "@/lib/services/supplier-drive-admin-list";

export async function GET() {
  try {
    await requireSupplierMasterSession();
    const driveRows = await listSupplierAccountsWithDrive();
    const accounts = await listAllSupplierAccounts();
    const meta = new Map(accounts.map((a) => [a.username, a]));

    const suppliers = driveRows.map((row) => {
      const a = meta.get(row.username);
      return {
        userId: a?.userId ?? "",
        supplierName: row.supplierName,
        contactName: row.contactName,
        username: row.username,
        email: a?.email ?? "",
        phone: a?.phone ?? "",
        status: row.status,
        emailVerified: a?.emailVerified ?? false,
        drive: row.drive,
      };
    });

    return Response.json({ ok: true, suppliers });
  } catch (error) {
    return jsonError(error, supplierAuthStatus(error));
  }
}
