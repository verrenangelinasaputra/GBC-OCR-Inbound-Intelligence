import { AppShell } from "@/components/layout/app-shell";

export default function NoAccessPage() {
  return (
    <AppShell title="Menunggu verifikasi admin">
      <div className="mx-auto max-w-lg rounded-xl border border-amber-200 bg-amber-50/80 p-8 text-center shadow-sm">
        <h1 className="text-lg font-semibold text-amber-950">Tunggu sampai admin verifikasi</h1>
        <p className="mt-3 text-sm text-amber-900/90">
          Akun Anda sudah aktif, tetapi menu belum diaktifkan. Super Admin akan memverifikasi dan mencentang halaman
          yang boleh Anda akses. Silakan login ulang setelah itu.
        </p>
      </div>
    </AppShell>
  );
}
