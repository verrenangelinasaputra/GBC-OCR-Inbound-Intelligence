import { jsonError, requireApiPermission } from "@/lib/api/auth-context";
import { isDbmAccurateExported } from "@/lib/dbm/accurate-transaction-import";
import { getInternalUserProfile, userCanAccessGudang } from "@/lib/internal-auth/profile";
import {
  accurateExportFileName,
  buildAccurateImportXlsxBuffer,
} from "@/lib/services/dbm-accurate-export-xlsx";
import { listDbmInboundRecords, markDbmInboundAccurateExported } from "@/lib/services/dbm-inbound-sheet";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const session = await requireApiPermission("data_barang_masuk", "EXPORT");
    const body = (await request.json()) as { rowKeys?: string[] };
    const rowKeys = [...new Set((body.rowKeys ?? []).map((k) => String(k).trim()).filter(Boolean))];
    if (!rowKeys.length) {
      return jsonError(new Error("Pilih minimal satu baris untuk diekspor"), 400);
    }

    const profile = await getInternalUserProfile(session.username);
    const gudangFilter = profile?.gudangList.length ? profile.gudangList : undefined;

    const all = await listDbmInboundRecords();
    const selected = all.filter((r) => rowKeys.includes(r.rowKey));

    if (selected.length !== rowKeys.length) {
      const found = new Set(selected.map((r) => r.rowKey));
      const missing = rowKeys.filter((k) => !found.has(k));
      return jsonError(new Error(`Baris tidak ditemukan: ${missing.slice(0, 3).join(", ")}`), 404);
    }

    for (const r of selected) {
      if (gudangFilter?.length && !userCanAccessGudang(gudangFilter, r.gudang)) {
        return jsonError(new Error("FORBIDDEN"), 403);
      }
    }

    const already = selected.filter(isDbmAccurateExported);
    if (already.length) {
      return jsonError(
        new Error(
          `${already.length} baris sudah diekspor Accurate (${already[0]?.accurateExportedAt || "—"}). Hapus centang baris tersebut.`
        ),
        409
      );
    }

    const buffer = await buildAccurateImportXlsxBuffer(selected);
    await markDbmInboundAccurateExported(selected.map((r) => r.sheetRow));

    const fileName = accurateExportFileName(selected.length);
    return new Response(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    return jsonError(e);
  }
}