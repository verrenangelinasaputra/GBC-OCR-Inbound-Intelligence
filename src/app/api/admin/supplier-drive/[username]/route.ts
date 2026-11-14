import { jsonError, requireSuperAdmin } from "@/lib/api/auth-context";
import { isSheetOnlyMode } from "@/lib/config/app-mode";
import { hasDatabase } from "@/lib/db";
import { isSupplierMasterUsername } from "@/lib/supplier-auth/master-admin";
import { upsertSupplierDriveSettings } from "@/lib/supplier-auth/supplier-drive-settings";

function enabled(): boolean {
  return isSheetOnlyMode() || !hasDatabase();
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ username: string }> }
) {
  if (!enabled()) return jsonError(new Error("Hanya mode spreadsheet"), 404);
  try {
    const session = await requireSuperAdmin();
    const { username: raw } = await context.params;
    const username = raw.trim().toLowerCase();
    if (isSupplierMasterUsername(username)) {
      return jsonError(new Error("Akun master supplier tidak bisa dikonfigurasi"), 403);
    }

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
  } catch (e) {
    return jsonError(e);
  }
}