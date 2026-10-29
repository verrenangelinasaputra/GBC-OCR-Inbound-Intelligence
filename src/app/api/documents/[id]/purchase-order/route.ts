import { requireApiSession, jsonError } from "@/lib/api/auth-context";
import { createPurchaseOrderFromDocument } from "@/lib/services/purchase-order-service";
import { redirect } from "next/navigation";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireApiSession();
    const { id } = await context.params;
    const po = await createPurchaseOrderFromDocument(id, session.userId);
    redirect(`/purchase-orders/${po.id}`);
  } catch (e) {
    return jsonError(e);
  }
}
