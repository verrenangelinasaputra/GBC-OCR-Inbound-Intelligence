import { approvePurchaseOrder } from "@/lib/services/purchase-order-service";
import { requireApiPermission, jsonError } from "@/lib/api/auth-context";
import { redirect } from "next/navigation";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireApiPermission("purchase_orders", "APPROVE");
    const { id } = await context.params;
    await approvePurchaseOrder(id, session.userId);
    redirect(`/purchase-orders/${id}`);
  } catch (e) {
    return jsonError(e);
  }
}
