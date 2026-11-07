import { jsonError } from "@/lib/api/auth-context";
import { isSheetOnlyMode } from "@/lib/config/app-mode";
import { supplierAuthStatus } from "@/lib/supplier-auth/errors";
import { sendPasswordResetCode } from "@/lib/supplier-auth/flow";

export async function POST(request: Request) {
  if (!isSheetOnlyMode()) {
    return jsonError(new Error("Reset password hanya aktif saat SHEET_ONLY_MODE=true."), 404);
  }
  try {
    const body = await request.json();
    const result = await sendPasswordResetCode(String(body.username ?? ""));
    return Response.json({ ok: true, ...result });
  } catch (error) {
    return jsonError(error, supplierAuthStatus(error));
  }
}
