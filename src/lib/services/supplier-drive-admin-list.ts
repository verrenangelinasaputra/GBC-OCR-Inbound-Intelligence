import "server-only";

import { listAllSupplierAccounts } from "@/lib/supplier-auth/directory";
import { isSupplierMasterUsername } from "@/lib/supplier-auth/master-admin";
import { listSupplierDriveSettings } from "@/lib/supplier-auth/supplier-drive-settings";

export type SupplierDriveAdminRow = {
  username: string;
  supplierName: string;
  contactName: string;
  status: string;
  drive: {
    driveRootFolderId: string;
    driveRootFolderUrl: string;
    mirrorEnabled: boolean;
    pathLocked: boolean;
    updatedAt?: string;
    updatedBy?: string;
  } | null;
};

export async function listSupplierAccountsWithDrive(): Promise<SupplierDriveAdminRow[]> {
  const [accounts, driveSettings] = await Promise.all([
    listAllSupplierAccounts(),
    listSupplierDriveSettings(),
  ]);
  const driveByUser = new Map(driveSettings.map((d) => [d.username, d]));

  return accounts
    .filter((a) => !isSupplierMasterUsername(a.username))
    .map((a) => {
      const drive = driveByUser.get(a.username);
      return {
        username: a.username,
        supplierName: a.supplierName,
        contactName: a.contactName,
        status: a.status,
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
    })
    .sort((a, b) => a.supplierName.localeCompare(b.supplierName, "id"));
}