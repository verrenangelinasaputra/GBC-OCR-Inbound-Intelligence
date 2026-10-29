import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";

export type PriceSuggestion = {
  priceFromMaster?: Prisma.Decimal;
  masterPriceId?: string;
  warnings: string[];
};

export async function suggestPurchasePrice(params: {
  internalProductId: string;
  supplierId: string;
  unit: string;
  asOfDate?: Date;
}): Promise<PriceSuggestion> {
  const asOf = params.asOfDate ?? new Date();
  const rows = await prisma.purchasePriceHistory.findMany({
    where: {
      internalProductId: params.internalProductId,
      supplierId: params.supplierId,
      unit: params.unit,
      effectiveFrom: { lte: asOf },
      OR: [{ effectiveTo: null }, { effectiveTo: { gte: asOf } }],
    },
    orderBy: { effectiveFrom: "desc" },
  });

  const warnings: string[] = [];
  if (rows.length === 0) {
    warnings.push("Tidak ada harga master yang valid untuk SKU/supplier/unit pada tanggal ini.");
    return { warnings };
  }
  if (rows.length > 1) {
    warnings.push("Beberapa harga master cocok — perlu review manual (tidak auto-pilih latest).");
    return { priceFromMaster: rows[0].unitPrice, masterPriceId: rows[0].id, warnings };
  }
  return { priceFromMaster: rows[0].unitPrice, masterPriceId: rows[0].id, warnings };
}
