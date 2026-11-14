import "server-only";

import { hasDatabase, prisma } from "@/lib/db";
import { getSkuMasterSheetId } from "@/lib/config/sku-mapping-sheets";
import { SKU_GENERATOR_CATEGORY_TABS } from "@/lib/sku-master/category-tabs";
import type { SkuMasterSyncSummary } from "@/lib/sku-master/types";
import {
  fetchRekapSkulRows,
  fetchRekapSkusRows,
  loadSkuMasterCodes,
} from "@/lib/services/sku-master-sheet";

export async function syncSkuMasterMirrorFromSpreadsheet(): Promise<SkuMasterSyncSummary> {
  const spreadsheetId = getSkuMasterSheetId();
  let codesCount = 0;

  for (const tab of SKU_GENERATOR_CATEGORY_TABS) {
    for (let subIndex = 1; subIndex <= 9; subIndex += 1) {
      try {
        const options = await loadSkuMasterCodes(tab, subIndex);
        codesCount += options.length;
        if (!hasDatabase()) continue;

        for (const opt of options) {
          await prisma.skuMasterCode.upsert({
            where: {
              spreadsheetId_categoryTab_subIndex_code: {
                spreadsheetId,
                categoryTab: tab,
                subIndex,
                code: opt.code,
              },
            },
            create: {
              spreadsheetId,
              categoryTab: tab,
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
      } catch {
        // Tab mungkin belum ada di sheet tertentu — lewati.
      }
    }
  }

  const rekapRows = await fetchRekapSkulRows();
  const rekapSkulCount = Math.max(0, rekapRows.length - 1);

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
  const rekapSkusCount = Math.max(0, skusRows.length - 1);

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

  return {
    spreadsheetId,
    codes: codesCount,
    rekapSkul: rekapSkulCount,
    rekapSkus: rekapSkusCount,
    dbPersisted: hasDatabase(),
  };
}