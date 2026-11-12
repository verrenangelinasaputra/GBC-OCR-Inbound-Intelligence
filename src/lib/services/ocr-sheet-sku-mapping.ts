import "server-only";

import { google } from "googleapis";
import { createGoogleAuthClient, resolveSheetTabName } from "@/lib/providers/google-workspace/client";
import { getGoogleExportConfigOptional } from "@/lib/providers/google-workspace/config";
import {
  mapOcrSheetRow,
  ocrSheetFullColumnsRange,
  type OcrSheetRowFields,
} from "@/lib/providers/google-workspace/ocr-sheet-columns";
import {
  docEligibleForSkuMapping,
  normalizeOcrReviewStatus,
  pickDominantReviewStatus,
  type OcrReviewStatus,
} from "@/lib/ocr-review/workflow-status";
import { encodeOcrSheetDocKey, isMeaningfulOcrDataRow } from "@/lib/services/ocr-sheet-keys";
import type { SkuMappingLineRow } from "@/lib/sku-matching/sku-mapping-line";
import { findTopRekapSkuMatches } from "@/lib/sku-matching/match-rekap-sku";
import type { SkuMappingWorkbenchRow } from "@/lib/sku-matching/sku-rekap-types";
import { loadSkuRekapCatalog } from "@/lib/services/sku-rekap-catalog";
import { loadMasterMappingEntries } from "@/lib/services/master-mapping-sheet";
import { listDbmFinalizedRowKeys } from "@/lib/services/dbm-inbound-sheet";

type DocGroup = {
  docKey: string;
  gudang: string;
  supplier: string;
  tanggal: string;
  noSuratJalan: string;
  reviewStatuses: Set<OcrReviewStatus>;
  lines: OcrSheetRowFields[];
};

export type { SkuMappingLineRow };

export async function listSelesaiSkuMappingLines(
  gudangFilter?: string[]
): Promise<SkuMappingLineRow[]> {
  const config = getGoogleExportConfigOptional();
  if (!config) return [];

  const auth = createGoogleAuthClient(config);
  const sheets = google.sheets({ version: "v4", auth });
  const sheetTab = await resolveSheetTabName(config);
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: config.sheetId,
    range: ocrSheetFullColumnsRange(sheetTab),
  });

  const rows = res.data.values ?? [];
  const groups = new Map<string, DocGroup>();

  for (let i = 1; i < rows.length; i += 1) {
    const row = rows[i] ?? [];
    if (!isMeaningfulOcrDataRow(row)) continue;
    const fields = mapOcrSheetRow(row);
    const rawKey = fields.fileName || `${fields.noSuratJalan}|${fields.tanggal}|${i}`;
    const docKey = encodeOcrSheetDocKey(rawKey);
    let group = groups.get(rawKey);
    if (!group) {
      group = {
        docKey,
        gudang: fields.gudang,
        supplier: fields.supplier,
        tanggal: fields.tanggal,
        noSuratJalan: fields.noSuratJalan,
        reviewStatuses: new Set(),
        lines: [],
      };
      groups.set(rawKey, group);
    }
    group.lines.push(fields);
    group.reviewStatuses.add(normalizeOcrReviewStatus(fields.statusReview));
  }

  const gudangSet = gudangFilter?.length ? new Set(gudangFilter) : null;
  const out: SkuMappingLineRow[] = [];

  for (const group of groups.values()) {
    const docStatus = pickDominantReviewStatus(group.reviewStatuses);
    if (!docEligibleForSkuMapping(docStatus)) continue;
    if (gudangSet && group.gudang && !gudangSet.has(group.gudang)) continue;

    group.lines.forEach((line, idx) => {
      out.push({
        rowKey: `${group.docKey}:${idx}`,
        docKey: group.docKey,
        gudang: group.gudang,
        supplier: group.supplier,
        tanggal: group.tanggal,
        noSuratJalan: group.noSuratJalan,
        namaBarang: line.namaBarang,
        banyaknya: line.banyaknya,
        isi: line.isi,
        jumlah: line.jumlah,
        keterangan: line.keterangan,
        sampleType: line.sampleType,
        fileUrl: line.fileUrl?.startsWith("http") ? line.fileUrl : "",
      });
    });
  }

  out.sort((a, b) => {
    const t = b.tanggal.localeCompare(a.tanggal, "id");
    if (t !== 0) return t;
    return a.namaBarang.localeCompare(b.namaBarang, "id");
  });

  return out;
}

export async function buildSkuMappingWorkbench(
  gudangFilter?: string[]
): Promise<SkuMappingWorkbenchRow[]> {
  const [lines, catalog, masterMappings, finalized] = await Promise.all([
    listSelesaiSkuMappingLines(gudangFilter),
    loadSkuRekapCatalog(),
    loadMasterMappingEntries(),
    listDbmFinalizedRowKeys(),
  ]);

  const pending = lines.filter((l) => !finalized.has(l.rowKey));

  return pending.map((line) => ({
    line,
    suggestions: findTopRekapSkuMatches(line.namaBarang, catalog, 3, masterMappings),
  }));
}

export async function getSelesaiLineByRowKey(
  rowKey: string,
  gudangFilter?: string[]
): Promise<SkuMappingLineRow | null> {
  const lines = await listSelesaiSkuMappingLines(gudangFilter);
  return lines.find((l) => l.rowKey === rowKey) ?? null;
}
