import { jsonError } from "@/lib/api/auth-context";
import { supplierAuthStatus } from "@/lib/supplier-auth/errors";
import { sendRegisterCode } from "@/lib/supplier-auth/flow";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = await sendRegisterCode(body);
    return Response.json({
      ok: true,
      message: "Kode verifikasi dikirim ke email Anda dari nomarcengkareng@gmail.com.",
      ...result,
    });
  } catch (error) {
    return jsonError(error, supplierAuthStatus(error));
  }
}
