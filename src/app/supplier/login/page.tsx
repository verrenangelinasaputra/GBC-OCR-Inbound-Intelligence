import { isSheetOnlyMode } from "@/lib/config/app-mode";
import { SupplierPasswordLogin } from "@/components/supplier/password-login";
import { SupplierSheetLogin } from "@/components/supplier/sheet-login";

export default function SupplierLoginPage() {
  if (isSheetOnlyMode()) return <SupplierSheetLogin />;
  return <SupplierPasswordLogin />;
}
