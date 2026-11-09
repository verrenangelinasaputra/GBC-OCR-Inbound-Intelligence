"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { ChevronLeft, ChevronRight, ImagePlus, ListChecks, LogOut, Shield } from "lucide-react";
import { useState } from "react";

const NAV_BASE = [
  { href: "/supplier", label: "Upload", icon: ImagePlus, exact: true },
  { href: "/supplier/submissions", label: "Status Pengiriman", icon: ListChecks, exact: false },
] as const;

const NAV_MASTER = {
  href: "/supplier/master",
  label: "Master Supplier",
  icon: Shield,
  exact: false,
} as const;

export function SupplierSidebar({ isMasterAdmin = false }: { isMasterAdmin?: boolean }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={clsx(
        "sticky top-0 flex h-screen shrink-0 flex-col border-r border-slate-200 bg-white transition-all",
        collapsed ? "w-[72px]" : "w-60"
      )}
    >
      <div className="flex items-center justify-between gap-2 border-b border-slate-200 px-4 py-4">
        {!collapsed && (
          <div>
            <p className="text-sm font-semibold text-slate-900">GBC Supplier</p>
            <p className="text-xs text-slate-500">Portal Surat Jalan</p>
          </div>
        )}
        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          className="rounded-md p-1.5 text-slate-600 hover:bg-slate-100"
          aria-label="Ciutkan sidebar"
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto p-2">
        {[...(isMasterAdmin ? [NAV_MASTER, ...NAV_BASE] : NAV_BASE)].map((item) => {
          const active = item.exact
            ? pathname === item.href
            : pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                "mb-0.5 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-blue-600 text-white"
                  : "text-slate-700 hover:bg-slate-100"
              )}
              title={item.label}
            >
              <Icon size={18} className="shrink-0" />
              {!collapsed && <span className="leading-tight">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-slate-200 p-2">
        <form action="/api/auth/logout" method="post">
          <button
            type="submit"
            className={clsx(
              "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-slate-600 hover:bg-slate-100",
              collapsed && "justify-center px-2"
            )}
            title="Logout"
          >
            <LogOut size={18} className="shrink-0" />
            {!collapsed && <span>Logout</span>}
          </button>
        </form>
      </div>
    </aside>
  );
}
