import { jsonError, requireApiSession } from "@/lib/api/auth-context";
import { hasPermission } from "@/lib/rbac/permissions";
import { SKU_GENERATOR_CATEGORY_TABS, SKU_SKUS_CATEGORY_TABS } from "@/lib/sku-master/category-tabs";
import { skuMasterApiEnabled } from "@/lib/sku-master/api-enabled";
import { getSkuMasterSheetId } from "@/lib/config/sku-mapping-sheets";
import { getSkuMasterSpreadsheetIdForClient } from "@/lib/services/sku-master-sheet";

export const SKU_SUB_LABELS = [
  "Kategori Utama (Sub 1)",
  "Nama Produk (Sub 2)",
  "Volume (Sub 3)",
  "Neck (Sub 4)",
  "Diameter (Sub 5)",
  "Warna (Sub 6)",
  "Gramasi (Sub 7)",
  "Supplier (Sub 8)",
  "Custom (Sub 9)",
] as const;

export async function GET() {
  if (!skuMasterApiEnabled()) return jsonError(new Error("Mode spreadsheet tidak aktif"), 404);
  try {
    const session = await requireApiSession();
    if (!hasPermission(session.roles, "master_mapping", "VIEW", session.allowedModules)) {
      return jsonError(new Error("FORBIDDEN"), 403);
    }

    const spreadsheetId = getSkuMasterSpreadsheetIdForClient();
    return Response.json({
      spreadsheetId,
      spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${getSkuMasterSheetId()}/edit`,
      generatorTabs: SKU_GENERATOR_CATEGORY_TABS,
      skusTabs: SKU_SKUS_CATEGORY_TABS,
      subLabels: SKU_SUB_LABELS,
    });
  } catch (e) {
    return jsonError(e);
  }
}