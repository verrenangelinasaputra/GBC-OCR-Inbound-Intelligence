import { MobileShellLayout } from "@/components/layout/mobile-shell-layout";
import { SupplierSidebar } from "@/components/supplier/supplier-sidebar";
import { getSession } from "@/lib/auth/session";
import { isSheetOnlyMode } from "@/lib/config/app-mode";
import { SUPPLIER_MASTER_ROLE } from "@/lib/supplier-auth/master-admin";

export default async function SupplierPortalLayout({ children }: { children: React.ReactNode }) {
  const sheetOnly = isSheetOnlyMode();
  const session = await getSession();
  const isMasterAdmin = session?.roles.includes(SUPPLIER_MASTER_ROLE) ?? false;

  const title = sheetOnly
    ? `Supplier · ${session?.username ?? "—"}`
    : `Halo, ${session?.username ?? "supplier"}`;

  return (
    <MobileShellLayout
      title={title}
      subtitle="GBC Inbound Intelligence · Portal Surat Jalan"
      desktopMainInsetClass="lg:pl-60"
      sidebar={<SupplierSidebar isMasterAdmin={isMasterAdmin} />}
    >
      {children}
    </MobileShellLayout>
  );
}
