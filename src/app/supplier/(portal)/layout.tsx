import { MobileShellLayout } from "@/components/layout/mobile-shell-layout";
import { SupplierSidebar } from "@/components/supplier/supplier-sidebar";
import { SupplierMappingPending } from "@/components/supplier/supplier-mapping-pending";
import { getSession } from "@/lib/auth/session";
import { isSheetOnlyMode } from "@/lib/config/app-mode";
import { SUPPLIER_MASTER_ROLE } from "@/lib/supplier-auth/master-admin";
import { isSupplierMappingApproved } from "@/lib/services/supplier-mapping-gate";
import { findSupplierByUsername } from "@/lib/supplier-auth/directory";
import { resolveSupplierCompanyName } from "@/lib/supplier-auth/resolve-company";

export default async function SupplierPortalLayout({ children }: { children: React.ReactNode }) {
  const sheetOnly = isSheetOnlyMode();
  const session = await getSession();
  const isMasterAdmin = session?.roles.includes(SUPPLIER_MASTER_ROLE) ?? false;
  const isSupplierUser = session?.roles.includes("SUPPLIER_USER") ?? false;

  let mappingBlocked = false;
  if (isSupplierUser && session?.username && !isMasterAdmin) {
    const account = await findSupplierByUsername(session.username);
    const supplierName = account?.supplierName || (await resolveSupplierCompanyName(session.username));
    mappingBlocked = !(await isSupplierMappingApproved({
      supplierName,
      supplierUsername: session.username,
    }));
  }

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
      {mappingBlocked && session?.username ? (
        <SupplierMappingPending username={session.username} />
      ) : (
        children
      )}
    </MobileShellLayout>
  );
}
