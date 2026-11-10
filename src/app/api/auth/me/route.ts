import { getSession } from "@/lib/auth/session";
import { isInternalSheetAuthEnabled } from "@/lib/config/internal-sheet";
import { getInternalUserProfile } from "@/lib/internal-auth/profile";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return Response.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }
  if (!isInternalSheetAuthEnabled()) {
    return Response.json({
      username: session.username,
      roles: session.roles,
      profile: null,
    });
  }
  const profile = await getInternalUserProfile(session.username);
  return Response.json({
    username: session.username,
    roles: session.roles,
    profile,
  });
}
