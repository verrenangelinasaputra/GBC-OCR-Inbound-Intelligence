"use client";

import clsx from "clsx";
import { useRouter, useSearchParams } from "next/navigation";
import { InternalUsersAdmin } from "@/components/admin/internal-users-admin";
import { SupplierAccountsMappingTab } from "@/components/admin/supplier-accounts-mapping-tab";

type TabId = "warehouse" | "supplier";

const TABS: { id: TabId; label: string }[] = [
  { id: "warehouse", label: "Warehouse (internal)" },
  { id: "supplier", label: "Supplier (kode & mapping)" },
];

export function UsersAdminTabs({ currentUsername }: { currentUsername: string }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const raw = searchParams.get("tab");
  const tab: TabId = raw === "supplier" ? "supplier" : "warehouse";

  function setTab(next: TabId) {
    const params = new URLSearchParams(searchParams.toString());
    if (next === "warehouse") params.delete("tab");
    else params.set("tab", next);
    const qs = params.toString();
    router.replace(qs ? `/users?${qs}` : "/users", { scroll: false });
  }

  return (
    <div className="space-y-6">
      <div
        role="tablist"
        aria-label="User management"
        className="flex flex-wrap gap-1 rounded-xl border border-slate-200 bg-slate-100 p-1"
      >
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={clsx(
              "rounded-lg px-4 py-2 text-sm font-medium transition-colors",
              tab === t.id
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "warehouse" ? (
        <InternalUsersAdmin currentUsername={currentUsername} />
      ) : (
        <SupplierAccountsMappingTab />
      )}
    </div>
  );
}
