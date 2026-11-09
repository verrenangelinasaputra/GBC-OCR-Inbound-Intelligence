import Link from "next/link";
import { getSession } from "@/lib/auth/session";
import { isSheetOnlyMode } from "@/lib/config/app-mode";

export default async function SupplierPortalLayout({ children }: { children: React.ReactNode }) {
  const sheetOnly = isSheetOnlyMode();
  const session = await getSession();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-6 py-4">
          <div>
            <p className="text-lg font-semibold text-slate-900">GBC Supplier Portal</p>
            <p className="text-sm text-slate-500">
              {sheetOnly
                ? `Masuk sebagai ${session?.username ?? "supplier"} · mode spreadsheet`
                : `Halo, ${session?.username ?? "supplier"}`}
            </p>
          </div>
          <nav className="flex items-center gap-1 text-sm">
            <Link
              href="/supplier"
              className="rounded-lg px-3 py-2 font-medium text-slate-700 hover:bg-slate-100"
            >
              Upload
            </Link>
            <Link
              href="/supplier/submissions"
              className="rounded-lg px-3 py-2 text-slate-600 hover:bg-slate-100"
            >
              Status Pengiriman
            </Link>
            <form action="/api/auth/logout" method="post" className="ml-2 border-l border-slate-200 pl-3">
              <button type="submit" className="rounded-lg px-3 py-2 text-slate-600 hover:bg-slate-100">
                Logout
              </button>
            </form>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-5xl p-6">{children}</main>
    </div>
  );
}
