import { clearSessionCookie, getSession } from "@/lib/auth/session";
import { isSheetOnlyMode } from "@/lib/config/app-mode";
import { writeAuditLog } from "@/lib/services/audit";
import { redirect } from "next/navigation";

export async function POST() {
  const session = await getSession();
  const sheetOnly = isSheetOnlyMode();
  const supplier = session?.roles.includes("SUPPLIER_USER") && !session.roles.includes("SUPER_ADMIN");
  if (session && !sheetOnly && !session.userId.startsWith("wa:")) {
    await writeAuditLog({
      actorId: session.userId,
      action: "auth.logout",
      entityType: "User",
      entityId: session.userId,
    });
  }
  await clearSessionCookie();
  redirect(sheetOnly || supplier ? "/supplier/login" : "/login");
}
