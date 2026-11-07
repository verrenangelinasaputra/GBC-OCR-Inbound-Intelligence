import { jsonError } from "@/lib/api/auth-context";
import { isSheetOnlyMode } from "@/lib/config/app-mode";
import { supplierAuthStatus } from "@/lib/supplier-auth/errors";
import { loginSupplier } from "@/lib/supplier-auth/flow";

export async function POST(request: Request) {
  if (!isSheetOnlyMode()) {
    return jsonError(new Error("Login spreadsheet hanya aktif saat SHEET_ONLY_MODE=true."), 404);
  }
  try {
    const body = await request.json();
    const result = await loginSupplier(String(body.username ?? ""), String(body.password ?? ""));
    return Response.json({ ok: true, ...result });
  } catch (error) {
    return jsonError(error, supplierAuthStatus(error));
  }
}
