import { jsonError } from "@/lib/api/auth-context";
import { supplierAuthStatus } from "@/lib/supplier-auth/errors";
import { sendPasswordResetCode } from "@/lib/supplier-auth/flow";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = await sendPasswordResetCode(String(body.username ?? ""));
    return Response.json({ ok: true, ...result });
  } catch (error) {
    return jsonError(error, supplierAuthStatus(error));
  }
}
