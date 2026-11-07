import Link from "next/link";
import { isSheetOnlyMode } from "@/lib/config/app-mode";
import { SupplierForgotPasswordForm } from "@/components/supplier/forgot-password-form";

export default function SupplierForgotPasswordPage() {
  if (!isSheetOnlyMode()) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-900 px-4 text-slate-100">
        <div className="w-full max-w-md rounded-xl border border-slate-700 bg-slate-800 p-8">
          <h1 className="text-xl font-semibold">Lupa password</h1>
          <p className="mt-2 text-sm text-slate-400">Reset lewat email aktif di mode spreadsheet.</p>
          <Link href="/supplier/login" className="mt-6 inline-block text-sm text-blue-300 hover:underline">
            Ke halaman login
          </Link>
        </div>
      </div>
    );
  }
  return <SupplierForgotPasswordForm />;
}
