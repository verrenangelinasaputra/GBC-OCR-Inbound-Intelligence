import { prisma } from "@/lib/db";
import { requireApiPermission, jsonError } from "@/lib/api/auth-context";
import { hashPassword } from "@/lib/auth/password";
import { writeAuditLog } from "@/lib/services/audit";

export async function POST(request: Request) {
  try {
    const session = await requireApiPermission("users", "MANAGE");
    const body = await request.json();
    const username = String(body.username).trim();
    const password = String(body.password);
    const fullName = String(body.fullName);
    const roleCode = String(body.roleCode);
    const supplierId = body.supplierId ? String(body.supplierId) : undefined;

    const role = await prisma.role.findUniqueOrThrow({ where: { code: roleCode } });
    const user = await prisma.user.create({
      data: {
        username,
        fullName,
        passwordHash: await hashPassword(password),
        supplierId,
        userRoles: { create: [{ roleId: role.id }] },
      },
    });
    await writeAuditLog({
      actorId: session.userId,
      action: "user.create",
      entityType: "User",
      entityId: user.id,
      after: { username, roleCode },
    });
    return Response.json({ ok: true, userId: user.id });
  } catch (e) {
    return jsonError(e);
  }
}
