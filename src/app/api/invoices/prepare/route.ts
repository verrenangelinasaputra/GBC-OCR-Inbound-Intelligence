import { prepareInvoiceFromPurchaseOrder } from "@/lib/services/invoice-service";
import { requireApiPermission, jsonError } from "@/lib/api/auth-context";
import { redirect } from "next/navigation";

export async function POST(request: Request) {
  try {
    const session = await requireApiPermission("invoices", "CREATE");
    const form = await request.formData();
    const purchaseOrderId = String(form.get("purchaseOrderId") ?? "");
    const invoice = await prepareInvoiceFromPurchaseOrder(purchaseOrderId, session.userId);
    redirect(`/invoices/${invoice.id}`);
  } catch (e) {
    return jsonError(e);
  }
}
