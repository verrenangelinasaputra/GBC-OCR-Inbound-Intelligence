import { jsonError } from "@/lib/api/auth-context";
import { supplierAuthStatus } from "@/lib/supplier-auth/errors";
import { requireSupplierMasterSession } from "@/lib/supplier-auth/require-master";
import { upsertSupplierDriveSettings } from "@/lib/supplier-auth/supplier-drive-settings";

export async function PUT(
  request: Request,
  context: { params: Promise<{ username: string }> }
) {
  try {
    const session = await requireSupplierMasterSession();
    const { username } = await context.params;
    const body = (await request.json()) as {
      driveRootFolderUrl?: string;
      driveRootFolderId?: string;
      mirrorEnabled?: boolean;
      pathLocked?: boolean;
    };

    const saved = await upsertSupplierDriveSettings({
      username,
      driveRootFolderUrl: body.driveRootFolderUrl,
      driveRootFolderId: body.driveRootFolderId,
      mirrorEnabled: body.mirrorEnabled,
      pathLocked: body.pathLocked,
      updatedBy: session.username,
    });

    return Response.json({
      ok: true,
      drive: {
        username: saved.username,
        driveRootFolderId: saved.driveRootFolderId,
        driveRootFolderUrl: saved.driveRootFolderUrl,
        mirrorEnabled: saved.mirrorEnabled,
        pathLocked: saved.pathLocked,
        updatedAt: saved.updatedAt,
        updatedBy: saved.updatedBy,
      },
    });
  } catch (error) {
    return jsonError(error, supplierAuthStatus(error));
  }
}
