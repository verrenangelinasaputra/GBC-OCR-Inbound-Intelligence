import { jsonError } from "@/lib/api/auth-context";
import { isInternalSheetAuthEnabled } from "@/lib/config/internal-sheet";
import { sendInternalRegisterCode } from "@/lib/internal-auth/register-flow";
import { supplierAuthStatus } from "@/lib/supplier-auth/errors";

export async function POST(request: Request) {
  if (!isInternalSheetAuthEnabled()) {
    return Response.json(
      { error: "Pendaftaran internal membutuhkan INTERNAL_SHEET_ID di environment." },
      { status: 503 }
    );
  }
  try {
    const body = await request.json();
    const result = await sendInternalRegisterCode(body);
    return Response.json({
      ok: true,
      message: "Kode verifikasi dikirim ke email Anda dari nomarcengkareng@gmail.com.",
      ...result,
    });
  } catch (error) {
    return jsonError(error, supplierAuthStatus(error));
  }
}
