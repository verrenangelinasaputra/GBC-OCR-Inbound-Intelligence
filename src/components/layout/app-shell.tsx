import { AppSidebar } from "./app-sidebar";
import { getSession } from "@/lib/auth/session";
import Link from "next/link";

export async function AppShell({ children, title }: { children: React.ReactNode; title: string }) {
  const session = await getSession();

  return (
    <div className="flex min-h-screen bg-slate-50">
      <AppSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
          <div>
            <h1 className="text-lg font-semibold text-slate-900">{title}</h1>
            <p className="text-sm text-slate-500">GBC Inbound Intelligence</p>
          </div>
          <div className="flex items-center gap-4 text-sm text-slate-600">
            <span>{session?.username}</span>
            <form action="/api/auth/logout" method="post">
              <button type="submit" className="text-blue-600 hover:underline">
                Logout
              </button>
            </form>
            <Link href="/notifications" className="text-blue-600 hover:underline">
              Notifikasi
            </Link>
          </div>
        </header>
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
