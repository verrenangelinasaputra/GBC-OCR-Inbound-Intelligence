export function SupplierMappingPending({ username }: { username: string }) {
  return (
    <div className="mx-auto max-w-lg rounded-xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-950 shadow-sm">
      <h2 className="text-lg font-semibold text-amber-900">Menunggu verifikasi supplier</h2>
      <p className="mt-2 leading-relaxed">
        Akun <strong>@{username}</strong> sudah terdaftar, tetapi nama perusahaan belum dicocokkan dengan{" "}
        <strong>kode supplier</strong> di Master Data GBC. Upload Surat Jalan baru bisa dilakukan setelah admin
        menyelesaikan mapping.
      </p>
      <p className="mt-3 text-amber-800">
        Hubungi tim GBC atau tunggu konfirmasi. Setelah mapping aktif, logout lalu login kembali.
      </p>
      <form action="/api/auth/logout" method="post" className="mt-5">
        <button
          type="submit"
          className="rounded-lg border border-amber-300 bg-white px-4 py-2 text-sm font-medium text-amber-900 hover:bg-amber-100"
        >
          Logout
        </button>
      </form>
    </div>
  );
}