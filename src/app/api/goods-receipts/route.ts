import { createGoodsReceipt } from "@/lib/services/goods-receipt-service";
import { requireApiPermission, jsonError } from "@/lib/api/auth-context";

export async function POST(request: Request) {
  try {
    const session = await requireApiPermission("goods_receiving", "SUBMIT");
    const body = await request.json();
    const gr = await createGoodsReceipt({
      purchaseOrderId: String(body.purchaseOrderId),
      receivedById: session.userId,
      lines: body.lines ?? [],
      notes: body.notes,
    });
    return Response.json({ ok: true, grNumber: gr.grNumber, id: gr.id });
  } catch (e) {
    return jsonError(e);
  }
}
