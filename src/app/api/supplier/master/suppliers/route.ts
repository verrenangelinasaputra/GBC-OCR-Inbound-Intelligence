import { jsonError } from "@/lib/api/auth-context";
import { listAllSupplierAccounts } from "@/lib/supplier-auth/directory";
import { supplierAuthStatus } from "@/lib/supplier-auth/errors";
import { requireSupplierMasterSession } from "@/lib/supplier-auth/require-master";
import { listSupplierDriveSettings } from "@/lib/supplier-auth/supplier-drive-settings";

export async function GET() {
  try {
    await requireSupplierMasterSession();
    const [accounts, driveSettings] = await Promise.all([
      listAllSupplierAccounts(),
      listSupplierDriveSettings(),
    ]);
    const driveByUser = new Map(driveSettings.map((d) => [d.username, d]));

    const suppliers = accounts.map((a) => {
      const drive = driveByUser.get(a.username);
      return {
        userId: a.userId,
        supplierName: a.supplierName,
        contactName: a.contactName,
        username: a.username,
        email: a.email,
        phone: a.phone,
        status: a.status,
        emailVerified: a.emailVerified,
        drive: drive
          ? {
              driveRootFolderId: drive.driveRootFolderId,
              driveRootFolderUrl: drive.driveRootFolderUrl,
              mirrorEnabled: drive.mirrorEnabled,
              pathLocked: drive.pathLocked,
              updatedAt: drive.updatedAt,
              updatedBy: drive.updatedBy,
            }
          : null,
      };
    });

    return Response.json({ ok: true, suppliers });
  } catch (error) {
    return jsonError(error, supplierAuthStatus(error));
  }
}
