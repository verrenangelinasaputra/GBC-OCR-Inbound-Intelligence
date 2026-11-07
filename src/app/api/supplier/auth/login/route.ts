import { jsonError } from "@/lib/api/auth-context";
import { supplierAuthStatus } from "@/lib/supplier-auth/errors";
import { loginSupplier } from "@/lib/supplier-auth/flow";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = await loginSupplier(String(body.username ?? ""), String(body.password ?? ""));
    return Response.json({ ok: true, ...result });
  } catch (error) {
    return jsonError(error, supplierAuthStatus(error));
  }
}
