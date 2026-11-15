"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  ScanLine,
  Link2,
  Package,
  Tags,
  Truck,
  Users,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useMemo, useState } from "react";
import type { AppModule } from "@/lib/rbac/modules";
import { PORTAL_NAV_SECTIONS } from "@/lib/rbac/nav-modules";
import { usesPerUserModuleAccess } from "@/lib/rbac/permissions";
import { portalAudienceFromPathname } from "@/lib/portal/paths";

const NAV_ICONS: Record<string, LucideIcon> = {
  "/dashboard": LayoutDashboard,
  "/ocr-review": ScanLine,
  "/sku-mapping": Link2,
  "/master-mapping": Tags,
  "/supplier-data-mapping": Truck,
  "/data-barang-masuk": Package,
  "/users": Users,
};

function iconForHref(href: string): LucideIcon {
  const key = href.startsWith("/customer/") ? href.replace(/^\/customer/, "") : href;
  return NAV_ICONS[key] ?? LayoutDashboard;
}

type NavItem = { href: string; label: string; icon: LucideIcon; module: AppModule };

export function AppSidebar({
  roles,
  allowedModulesGudang,
  allowedModulesCustomer,
}: {
  roles: string[];
  allowedModulesGudang?: AppModule[];
  allowedModulesCustomer?: AppModule[];
}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const isSuperAdmin = roles.includes("SUPER_ADMIN");
  const activeAudience = portalAudienceFromPathname(pathname);

  const filterItems = useMemo(() => {
    return (
      items: { href: string; label: string; module: AppModule }[],
      sectionId: (typeof PORTAL_NAV_SECTIONS)[number]["id"]
    ): NavItem[] => {
      const mapped = items.map((m) => ({
        href: m.href,
        label: m.label,
        module: m.module,
        icon: iconForHref(m.href),
      }));
      if (isSuperAdmin) return mapped;
      if (sectionId === "admin") {
        return isSuperAdmin ? mapped : [];
      }
      const mods =
        sectionId === "customer"
          ? (allowedModulesCustomer ?? [])
          : (allowedModulesGudang ?? []);
      if (usesPerUserModuleAccess(roles)) {
        return mapped.filter((item) => mods.includes(item.module));
      }
      if (mods.length) {
        return mapped.filter((item) => mods.includes(item.module));
      }
      return mapped;
    };
  }, [allowedModulesCustomer, allowedModulesGudang, isSuperAdmin, roles]);

  const sections = useMemo(() => {
    return PORTAL_NAV_SECTIONS.map((section) => ({
      ...section,
      items: filterItems(section.items, section.id),
    })).filter((s) => s.items.length > 0);
  }, [filterItems]);

  const menuAwaitingAdmin =
    !isSuperAdmin &&
    usesPerUserModuleAccess(roles) &&
  sections.every((s) => s.items.length === 0);

  return (
    <aside
      className={clsx(
        "flex h-full min-h-0 w-full flex-col overflow-hidden border-r border-slate-200 bg-slate-950 text-slate-100 transition-[width]",
        collapsed ? "w-[72px] max-w-[72px]" : "w-64 max-w-[16rem]"
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
        {menuAwaitingAdmin && !collapsed ? (
          <p className="rounded-lg border border-amber-500/35 bg-amber-500/10 px-3 py-3 text-xs leading-relaxed text-amber-100">
            Tunggu sampai admin verifikasi dan mengaktifkan menu untuk akun Anda.
          </p>
        ) : null}
        {sections.map((section) => (
          <div key={section.id} className="mb-3">
            {!collapsed ? (
              <p
                className={clsx(
                  "mb-1 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider",
                  section.id === activeAudience ||
                  (activeAudience === "admin" && section.id === "admin")
                    ? "text-blue-300"
                    : "text-slate-500"
                )}
              >
                {section.title}
              </p>
            ) : null}
            {section.items.map((item) => {
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
          </div>
        ))}
      </nav>
      <div className="border-t border-slate-800 p-3 text-xs text-slate-500">
        {!collapsed && <p>Internal portal — GBC</p>}
      </div>
    </aside>
  );
}