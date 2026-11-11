import "server-only";

import { aggregateDbmInboundRecords, summarizeInboundTotals } from "@/lib/dbm/aggregate-inbound";
import type { DbmInboundAggregate, DbmInboundRecord } from "@/lib/dbm/dbm-inbound-types";
import { listDbmInboundRecords } from "@/lib/services/dbm-inbound-sheet";
import { listOcrDocumentsFromSheet } from "@/lib/services/ocr-sheet-list";
import { userCanAccessGudang } from "@/lib/internal-auth/profile";

function enrichDriveLinks(
  records: DbmInboundRecord[],
  docDrive: Map<string, string>
): DbmInboundRecord[] {
  return records.map((r) => {
    if (r.linkSjDrive.startsWith("http")) return r;
    const fromOcr = docDrive.get(r.docKey) ?? "";
    return { ...r, linkSjDrive: fromOcr };
  });
}

export async function loadDataBarangMasukView(gudangFilter?: string[]): Promise<{
  groups: DbmInboundAggregate[];
  summary: ReturnType<typeof summarizeInboundTotals>;
}> {
  const [records, ocrDocs] = await Promise.all([
    listDbmInboundRecords(),
    listOcrDocumentsFromSheet(undefined, gudangFilter),
  ]);

  const docDrive = new Map(ocrDocs.map((d) => [d.docKey, d.fileUrl]));

  const filtered = records.filter((r) => {
    if (!gudangFilter?.length) return true;
    return userCanAccessGudang(gudangFilter, r.gudang);
  });

  const enriched = enrichDriveLinks(filtered, docDrive);
  const groups = aggregateDbmInboundRecords(enriched);
  return { groups, summary: summarizeInboundTotals(groups) };
}
