import { SupplierUploadForm } from "@/components/supplier/supplier-upload-form";

export default function SupplierUploadPage() {
  return (
    <div className="space-y-2">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Upload Surat Jalan</h1>
        <p className="mt-1 text-sm text-slate-500">
          Unggah foto SJ, pilih gudang tujuan, lalu verifikasi sebelum dikirim ke tim GBC.
        </p>
      </div>
      <SupplierUploadForm />
    </div>
  );
}
