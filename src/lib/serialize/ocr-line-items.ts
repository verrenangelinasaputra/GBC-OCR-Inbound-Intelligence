import type { InternalProduct, OcrLineItem } from "@prisma/client";
import { Prisma } from "@prisma/client";

type LineWithProduct = OcrLineItem & { internalProduct: InternalProduct | null };

function dec(value: Prisma.Decimal | null | undefined): string | null {
  if (value == null) return null;
  return value.toString();
}

export type SerializedOcrLine = {
  id: string;
  lineNumber: number;
  supplierProductName: string | null;
  supplierProductCode: string | null;
  quantityRaw: string | null;
  unitRaw: string | null;
  lineTotalRaw: string | null;
  mappingStatus: string;
  internalProduct: { sku: string; name: string } | null;
};

export function serializeOcrLineItems(lines: LineWithProduct[]): SerializedOcrLine[] {
  return lines.map((line) => ({
    id: line.id,
    lineNumber: line.lineNumber,
    supplierProductName: line.supplierProductName,
    supplierProductCode: line.supplierProductCode,
    quantityRaw: line.quantityRaw ?? dec(line.quantityVerified),
    unitRaw: line.unitRaw,
    lineTotalRaw: line.lineTotalRaw ?? dec(line.lineTotalVerified),
    mappingStatus: line.mappingStatus,
    internalProduct: line.internalProduct
      ? { sku: line.internalProduct.sku, name: line.internalProduct.name }
      : null,
  }));
}
