"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import {
  LayoutDashboard,
  Truck,
  FileText,
  ScanLine,
  Link2,
  ShoppingCart,
  PackageCheck,
  AlertTriangle,
  Tags,
  Receipt,
  Wallet,
  Building2,
  BarChart3,
  Bell,
  ScrollText,
  Users,
  Plug,
  Settings,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useState } from "react";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/nkb", label: "Incoming Shipments / NKB", icon: Truck },
  { href: "/surat-jalan", label: "Surat Jalan Documents", icon: FileText },
  { href: "/ocr-review", label: "OCR Review Queue", icon: ScanLine },
  { href: "/sku-mapping", label: "Product SKU Mapping", icon: Link2 },
  { href: "/purchase-orders", label: "Purchase Orders (PP)", icon: ShoppingCart },
  { href: "/goods-receiving", label: "Goods Receiving", icon: PackageCheck },
  { href: "/discrepancies", label: "Discrepancy Management", icon: AlertTriangle },
  { href: "/master-prices", label: "Master Harga Beli", icon: Tags },
  { href: "/invoices", label: "Purchase Invoices", icon: Receipt },
  { href: "/accounts-payable", label: "Accounts Payable", icon: Wallet },
  { href: "/suppliers", label: "Supplier Management", icon: Building2 },
  { href: "/reports", label: "Reports & Analytics", icon: BarChart3 },
  { href: "/notifications", label: "Notifications", icon: Bell },
  { href: "/audit-logs", label: "Audit Logs", icon: ScrollText },
  { href: "/users", label: "User & Role Management", icon: Users },
  { href: "/integrations", label: "Integration Settings", icon: Plug },
  { href: "/settings", label: "System Settings", icon: Settings },
];

export function AppSidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={clsx(
        "flex h-screen flex-col border-r border-slate-200 bg-slate-950 text-slate-100 transition-all",
        collapsed ? "w-[72px]" : "w-64"
      )}
    >
      <div className="flex items-center justify-between gap-2 border-b border-slate-800 px-4 py-4">
        {!collapsed && (
          <div>
            <p className="text-sm font-semibold text-white">GBC Inbound Intelligence</p>
            <p className="text-xs text-slate-400">Surat Jalan & DBM</p>
          </div>
        )}
        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          className="rounded-md p-1.5 hover:bg-slate-800"
          aria-label="Toggle sidebar"
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>
      <nav className="flex-1 overflow-y-auto p-2">
        {NAV.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                "mb-0.5 flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                active ? "bg-blue-600 text-white" : "text-slate-300 hover:bg-slate-800 hover:text-white"
              )}
              title={item.label}
            >
              <Icon size={18} className="shrink-0" />
              {!collapsed && <span className="leading-tight">{item.label}</span>}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-slate-800 p-3 text-xs text-slate-500">
        {!collapsed && <p>Internal portal — GBC</p>}
      </div>
    </aside>
  );
}
