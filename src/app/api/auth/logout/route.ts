import { clearSessionCookie, getSession } from "@/lib/auth/session";
import { writeAuditLog } from "@/lib/services/audit";
import { redirect } from "next/navigation";

export async function POST() {
  const session = await getSession();
  if (session) {
    await writeAuditLog({
      actorId: session.userId,
      action: "auth.logout",
      entityType: "User",
      entityId: session.userId,
    });
  }
  await clearSessionCookie();
  redirect("/login");
}
