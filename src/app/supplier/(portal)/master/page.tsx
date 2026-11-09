import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { SUPPLIER_MASTER_ROLE } from "@/lib/supplier-auth/master-admin";
import { SupplierMasterPanel } from "@/components/supplier/supplier-master-panel";

export default async function SupplierMasterPage() {
  const session = await getSession();
  if (!session?.roles.includes(SUPPLIER_MASTER_ROLE)) {
    redirect("/supplier");
  }

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Master Supplier</h1>
        <p className="text-sm text-slate-600">
          Kelola daftar supplier dan lokasi folder Google Drive untuk salinan otomatis setiap upload.
        </p>
      </div>
      <SupplierMasterPanel />
    </div>
  );
}
