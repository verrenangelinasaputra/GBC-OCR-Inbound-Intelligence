import { getSession } from "@/lib/auth/session";
import type { SessionPayload } from "@/lib/auth/session";
import { SupplierAuthError } from "./errors";
import { SUPPLIER_MASTER_ROLE } from "./master-admin";

export async function requireSupplierMasterSession(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session?.roles.includes(SUPPLIER_MASTER_ROLE)) {
    throw new SupplierAuthError("UNAUTHORIZED", 401);
  }
  return session;
}
