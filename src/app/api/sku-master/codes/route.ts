import { jsonError, requireApiSession } from "@/lib/api/auth-context";
import { hasPermission } from "@/lib/rbac/permissions";
import { skuMasterApiEnabled } from "@/lib/sku-master/api-enabled";
import { appendSkuMasterCode, loadSkuMasterCodes } from "@/lib/services/sku-master-sheet";
import { hasDatabase, prisma } from "@/lib/db";
import { getSkuMasterSheetId } from "@/lib/config/sku-mapping-sheets";

export async function GET(request: Request) {
  if (!skuMasterApiEnabled()) return jsonError(new Error("Mode spreadsheet tidak aktif"), 404);
  try {
    const session = await requireApiSession();
    if (!hasPermission(session.roles, "master_mapping", "VIEW", session.allowedModules)) {
      return jsonError(new Error("FORBIDDEN"), 403);
    }

    const url = new URL(request.url);
    const categoryTab = String(url.searchParams.get("tab") ?? "").trim();
    const subIndex = Number(url.searchParams.get("sub") ?? "1");
    if (!categoryTab) return jsonError(new Error("Parameter tab wajib"), 400);

    const options = await loadSkuMasterCodes(categoryTab, subIndex);
    return Response.json({ options });
  } catch (e) {
    return jsonError(e);
  }
}

export async function POST(request: Request) {
  if (!skuMasterApiEnabled()) return jsonError(new Error("Mode spreadsheet tidak aktif"), 404);
  try {
    const session = await requireApiSession();
    const canWrite =
      hasPermission(session.roles, "master_mapping", "CREATE", session.allowedModules) ||
      hasPermission(session.roles, "master_mapping", "EDIT", session.allowedModules);
    if (!canWrite) return jsonError(new Error("FORBIDDEN"), 403);

    const body = await request.json();
    const categoryTab = String(body.tab ?? "").trim();
    const subIndex = Number(body.sub ?? "0");
    const code = String(body.code ?? "").trim();
    const label = String(body.label ?? "").trim();

    const saved = await appendSkuMasterCode(categoryTab, subIndex, code, label);

    if (hasDatabase()) {
      const spreadsheetId = getSkuMasterSheetId();
      await prisma.skuMasterCode.upsert({
        where: {
          spreadsheetId_categoryTab_subIndex_code: {
            spreadsheetId,
            categoryTab,
            subIndex,
            code: saved.code,
          },
        },
        create: {
          spreadsheetId,
          categoryTab,
          subIndex,
          code: saved.code,
          label: saved.label,
          sheetRow: saved.sheetRow,
        },
        update: { label: saved.label, sheetRow: saved.sheetRow },
      });
    }

    return Response.json({ ok: true, option: saved });
  } catch (e) {
    return jsonError(e);
  }
}