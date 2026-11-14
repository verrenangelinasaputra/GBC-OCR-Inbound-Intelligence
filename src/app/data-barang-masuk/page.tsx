import { ModuleListPage } from "@/components/layout/module-list-page";
import { SpreadsheetModePage, spreadsheetModeActive } from "@/components/layout/spreadsheet-mode-page";
import { DataBarangMasukTable } from "@/components/data-barang-masuk/data-barang-masuk-table";
import { DataBarangMasukExportPanel } from "@/components/data-barang-masuk/data-barang-masuk-export-panel";
import { getSession } from "@/lib/auth/session";
import { hasPermission } from "@/lib/rbac/permissions";
import { getInternalUserProfile } from "@/lib/internal-auth/profile";
import { loadDataBarangMasukView } from "@/lib/services/data-barang-masuk";
import { getGoogleExportConfigOptional } from "@/lib/providers/google-workspace/config";
import { DBM_INBOUND_SHEET_ID, getDbmInboundTabName } from "@/lib/config/sku-mapping-sheets";

export default async function DataBarangMasukPage() {
  if (spreadsheetModeActive()) {
    if (!getGoogleExportConfigOptional()) {
      return <SpreadsheetModePage title="Data Barang Masuk" />;
    }

    let view: Awaited<ReturnType<typeof loadDataBarangMasukView>> = {
      groups: [],
      rows: [],
      summary: { groupCount: 0, shipmentRows: 0, mergedSkuGroups: 0, totalQty: 0 },
    };
    let canExport = false;
    try {
      const session = await getSession();
      const profile = session ? await getInternalUserProfile(session.username) : null;
      const gudangFilter = profile?.gudangList.length ? profile.gudangList : undefined;
      view = await loadDataBarangMasukView(gudangFilter);
      canExport = session
        ? hasPermission(session.roles, "data_barang_masuk", "EXPORT", session.allowedModules)
        : false;
    } catch {
      return <SpreadsheetModePage title="Data Barang Masuk" />;
    }

    const { groups, rows, summary } = view;

    return (
      <ModuleListPage
        title="Data Barang Masuk"
        description="Rekap barang yang sudah final DBM — digabung otomatis jika match SKU 100%, dengan lampiran Surat Jalan per pengiriman."
      >
        <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-xs text-slate-500">Baris final DBM</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">{summary.shipmentRows}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-xs text-slate-500">Grup produk</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">{summary.groupCount}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-xs text-slate-500">Grup digabung (match 100%)</p>
            <p className="mt-1 text-2xl font-semibold text-emerald-700">{summary.mergedSkuGroups}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-xs text-slate-500">Total kuantitas (angka)</p>
            <p className="mt-1 text-2xl font-semibold text-blue-700">
              {summary.totalQty.toLocaleString("id-ID")}
            </p>
          </div>
        </div>

        <p className="mb-4 text-sm text-slate-600">
          Sumber: tab <strong>{getDbmInboundTabName()}</strong> pada{" "}
          <a
            href={`https://docs.google.com/spreadsheets/d/${DBM_INBOUND_SHEET_ID}/edit`}
            target="_blank"
            rel="noreferrer"
            className="text-blue-600 hover:underline"
          >
            spreadsheet Data Barang Masuk
          </a>
          . Pilih baris untuk ekspor Accurate, atau klik panah pada rekap untuk tiap SJ + Drive.
        </p>

        <DataBarangMasukExportPanel rows={rows} canExport={canExport} />

        <h2 className="mb-3 text-base font-semibold text-slate-900">Rekap produk (agregasi)</h2>
        <DataBarangMasukTable groups={groups} />
      </ModuleListPage>
    );
  }

  return <SpreadsheetModePage title="Data Barang Masuk" />;
}
