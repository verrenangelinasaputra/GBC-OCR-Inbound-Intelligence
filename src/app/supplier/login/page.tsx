import { SupplierPasswordLogin } from "@/components/supplier/password-login";
import { SupplierSheetLogin } from "@/components/supplier/sheet-login";
import { isSheetOnlyMode } from "@/lib/config/app-mode";

export default function SupplierLoginPage() {
  if (isSheetOnlyMode()) return <SupplierSheetLogin />;
  return <SupplierPasswordLogin />;
}
