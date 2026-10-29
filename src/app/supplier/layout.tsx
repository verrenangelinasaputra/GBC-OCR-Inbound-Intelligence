import Link from "next/link";
import { getSession } from "@/lib/auth/session";

export default async function SupplierLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  const isLogin = !session;

  if (isLogin) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      <header className="border-b border-slate-700 px-6 py-4 flex justify-between items-center">
        <div>
          <p className="font-semibold">GBC Supplier Portal</p>
          <p className="text-xs text-slate-400">Surat Jalan Upload</p>
        </div>
        <div className="flex gap-4 text-sm">
          <Link href="/supplier" className="hover:text-blue-400">
            Upload
          </Link>
          <Link href="/supplier/submissions" className="hover:text-blue-400">
            Status Pengiriman
          </Link>
          <form action="/api/auth/logout" method="post">
            <button type="submit" className="text-slate-400 hover:text-white">
              Logout
            </button>
          </form>
        </div>
      </header>
      <main className="mx-auto max-w-4xl p-6">{children}</main>
    </div>
  );
}
