import { prisma } from "@/lib/db";
import { verifyPassword } from "@/lib/auth/password";
import { createSessionToken, setSessionCookie } from "@/lib/auth/session";
import { writeAuditLog } from "@/lib/services/audit";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const username = String(body.username ?? "").trim();
    const password = String(body.password ?? "");

    const user = await prisma.user.findUnique({
      where: { username },
      include: { userRoles: { include: { role: true } }, supplier: true },
    });

    if (!user || user.status !== "ACTIVE") {
      return Response.json({ error: "Username atau password salah" }, { status: 401 });
    }

    const ok = await verifyPassword(password, user.passwordHash);
    if (!ok) {
      return Response.json({ error: "Username atau password salah" }, { status: 401 });
    }

    const roles = user.userRoles.map((ur) => ur.role.code);
    const token = await createSessionToken({
      userId: user.id,
      username: user.username,
      roles,
      supplierId: user.supplierId,
    });
    await setSessionCookie(token);

    await writeAuditLog({
      actorId: user.id,
      action: "auth.login",
      entityType: "User",
      entityId: user.id,
    });

    const redirect =
      roles.includes("SUPPLIER_USER") && !roles.includes("SUPER_ADMIN")
        ? "/supplier"
        : "/dashboard";

    return Response.json({ ok: true, redirect, roles });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("[auth.login]", message);

    if (message.includes("SESSION_SECRET")) {
      return Response.json(
        {
          error:
            "SESSION_SECRET belum valid di server (Vercel → Environment Variables, min. 32 karakter, lalu Redeploy).",
        },
        { status: 500 }
      );
    }
    if (message.includes("Can't reach database server")) {
      return Response.json(
        {
          error:
            "Database tidak terjangkau dari Vercel. Supabase: Restore project jika paused, ganti DATABASE_URL ke Transaction pooler (port 6543 + pgbouncer=true).",
        },
        { status: 500 }
      );
    }
    if (/authentication failed|password authentication/i.test(message)) {
      return Response.json(
        {
          error:
            "Password di DATABASE_URL salah (encode ! jadi %21). Cek env Vercel lalu Redeploy.",
        },
        { status: 500 }
      );
    }

    return Response.json({ error: "Login gagal — buka /api/health untuk diagnosa." }, { status: 500 });
  }
}
