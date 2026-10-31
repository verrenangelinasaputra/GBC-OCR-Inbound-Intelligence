import { prisma } from "@/lib/db";

export async function GET() {
  const sessionSecret = process.env.SESSION_SECRET?.trim() ?? "";
  const dbUrl = process.env.DATABASE_URL ?? "";
  const hostHint = dbUrl.replace(/:[^:@]+@/, ":****@").split("?")[0];

  const checks: Record<string, { ok: boolean; detail: string }> = {
    sessionSecret: {
      ok: sessionSecret.length >= 32,
      detail:
        sessionSecret.length >= 32
          ? `OK (${sessionSecret.length} chars)`
          : sessionSecret.length
            ? `Terlalu pendek (${sessionSecret.length} chars, min. 32)`
            : "Tidak di-set di Vercel",
    },
    databaseUrl: {
      ok: dbUrl.startsWith("postgresql://") || dbUrl.startsWith("postgres://"),
      detail: dbUrl ? hostHint : "DATABASE_URL kosong",
    },
    poolerHint: {
      ok: dbUrl.includes("pooler.supabase.com") || dbUrl.includes("6543"),
      detail: dbUrl.includes("db.") && dbUrl.includes("supabase.co:5432")
        ? "Direct Supabase (5432) — sering gagal di Vercel; pakai pooler 6543"
        : dbUrl.includes("pooler") || dbUrl.includes("6543")
          ? "Terlihat pooler"
          : "Bukan Supabase atau host tidak dikenali",
    },
  };

  let dbOk = false;
  let userCount: number | null = null;
  let dbError = "";

  try {
    userCount = await prisma.user.count();
    dbOk = true;
  } catch (e) {
    dbError = e instanceof Error ? e.message : "Koneksi DB gagal";
  }

  checks.database = {
    ok: dbOk,
    detail: dbOk ? `OK — ${userCount} user` : dbError.slice(0, 280),
  };

  const ok = checks.sessionSecret.ok && checks.databaseUrl.ok && checks.database.ok;

  return Response.json(
    {
      ok,
      vercel: process.env.VERCEL === "1",
      checks,
    },
    { status: ok ? 200 : 503 }
  );
}
