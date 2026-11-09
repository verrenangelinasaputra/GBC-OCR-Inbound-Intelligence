import { SupplierSidebar } from "@/components/supplier/supplier-sidebar";
import { getSession } from "@/lib/auth/session";
import { isSheetOnlyMode } from "@/lib/config/app-mode";

export default async function SupplierPortalLayout({ children }: { children: React.ReactNode }) {
  const sheetOnly = isSheetOnlyMode();
  const session = await getSession();

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900">
      <SupplierSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="border-b border-slate-200 bg-white px-6 py-4">
          <p className="text-sm text-slate-500">GBC Inbound Intelligence</p>
          <p className="text-lg font-semibold text-slate-900">
            {sheetOnly
              ? `Supplier · ${session?.username ?? "—"}`
              : `Halo, ${session?.username ?? "supplier"}`}
          </p>
        </header>
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
