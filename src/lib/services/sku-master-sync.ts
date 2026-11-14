import "server-only";

import { hasDatabase, prisma } from "@/lib/db";
import { getSkuMasterSheetId } from "@/lib/config/sku-mapping-sheets";
import { SKU_GENERATOR_CATEGORY_TABS } from "@/lib/sku-master/category-tabs";
import type { SkuMasterSyncSummary } from "@/lib/sku-master/types";
import {
  fetchRekapSkulRows,
  fetchRekapSkusRows,
  invalidateSkuMasterListCaches,
  loadSkuMasterCodesForTab,
} from "@/lib/services/sku-master-sheet";

async function persistCodesForTab(
  spreadsheetId: string,
  categoryTab: string,
  bySub: Record<number, import("@/lib/sku-master/types").SkuMasterCodeOption[]>
): Promise<number> {
  if (!hasDatabase()) return 0;
  let n = 0;
  for (let subIndex = 1; subIndex <= 9; subIndex += 1) {
    for (const opt of bySub[subIndex] ?? []) {
      n += 1;
      await prisma.skuMasterCode.upsert({
        where: {
          spreadsheetId_categoryTab_subIndex_code: {
            spreadsheetId,
            categoryTab,
            subIndex,
            code: opt.code,
          },
        },
        create: {
          spreadsheetId,
          categoryTab,
          subIndex,
          code: opt.code,
          label: opt.label,
          sheetRow: opt.sheetRow,
        },
        update: {
          label: opt.label,
          sheetRow: opt.sheetRow,
        },
      });
    }
  }
  return n;
}

export async function syncSkuMasterMirrorFromSpreadsheet(options?: {
  codes?: boolean;
  rekap?: boolean;
}): Promise<SkuMasterSyncSummary> {
  const includeCodes = options?.codes !== false;
  const includeRekap = options?.rekap !== false;

  const spreadsheetId = getSkuMasterSheetId();
  let codesCount = 0;

  if (includeCodes) {
    for (const tab of SKU_GENERATOR_CATEGORY_TABS) {
      try {
        const bySub = await loadSkuMasterCodesForTab(tab);
        for (let subIndex = 1; subIndex <= 9; subIndex += 1) {
          codesCount += (bySub[subIndex] ?? []).length;
        }
        await persistCodesForTab(spreadsheetId, tab, bySub);
      } catch {
        // Tab mungkin belum ada di sheet tertentu — lewati.
      }
    }
  }

  let rekapSkulCount = 0;
  let rekapSkusCount = 0;

  if (!includeRekap) {
    return {
      spreadsheetId,
      codes: codesCount,
      rekapSkul: 0,
      rekapSkus: 0,
      dbPersisted: hasDatabase(),
    };
  }

  const rekapRows = await fetchRekapSkulRows();
  rekapSkulCount = Math.max(0, rekapRows.length - 1);

  if (hasDatabase()) {
    for (let i = 1; i < rekapRows.length; i += 1) {
      const row = rekapRows[i] ?? [];
      const skuLengkap = String(row[1] ?? "").trim();
      if (!skuLengkap) continue;
      await prisma.skuMasterCatalogLine.upsert({
        where: { spreadsheetId_skuLengkap: { spreadsheetId, skuLengkap } },
        create: {
          spreadsheetId,
          rowNo: String(row[0] ?? i).trim(),
          skuLengkap,
          namaInternalAccurate: String(row[2] ?? "").trim() || null,
          namaProdukAcuan: String(row[3] ?? "").trim() || null,
          kategoriUtama: String(row[4] ?? "").trim() || null,
          skus: String(row[5] ?? "").trim() || null,
          barcode: String(row[6] ?? "").trim() || null,
          sumberLembar: String(row[7] ?? "").trim() || null,
        },
        update: {
          rowNo: String(row[0] ?? i).trim(),
          namaInternalAccurate: String(row[2] ?? "").trim() || null,
          namaProdukAcuan: String(row[3] ?? "").trim() || null,
          kategoriUtama: String(row[4] ?? "").trim() || null,
          skus: String(row[5] ?? "").trim() || null,
          barcode: String(row[6] ?? "").trim() || null,
          sumberLembar: String(row[7] ?? "").trim() || null,
        },
      });
    }
  }

  const skusRows = await fetchRekapSkusRows();
  rekapSkusCount = Math.max(0, skusRows.length - 1);

  if (hasDatabase()) {
    for (let i = 1; i < skusRows.length; i += 1) {
      const row = skusRows[i] ?? [];
      const skus = String(row[1] ?? "").trim();
      if (!skus) continue;
      const variantCount = Number(String(row[3] ?? "0").replace(/\D/g, "")) || 0;
      await prisma.skuMasterSkusFamily.upsert({
        where: { spreadsheetId_skus: { spreadsheetId, skus } },
        create: {
          spreadsheetId,
          skus,
          namaInternal: String(row[2] ?? "").trim() || null,
          variantCount,
          sourceTab: String(row[4] ?? "").trim() || null,
        },
        update: {
          namaInternal: String(row[2] ?? "").trim() || null,
          variantCount,
          sourceTab: String(row[4] ?? "").trim() || null,
        },
      });
    }
  }

  invalidateSkuMasterListCaches();

  return {
    spreadsheetId,
    codes: codesCount,
    rekapSkul: rekapSkulCount,
    rekapSkus: rekapSkusCount,
    dbPersisted: hasDatabase(),
  };
}