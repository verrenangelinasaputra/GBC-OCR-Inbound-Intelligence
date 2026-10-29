import { verifyInvoiceAndCreatePayable } from "@/lib/services/invoice-service";
import { requireApiPermission, jsonError } from "@/lib/api/auth-context";
import { redirect } from "next/navigation";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireApiPermission("invoices", "APPROVE");
    const { id } = await context.params;
    const form = await request.formData();
    const paymentTermCode = String(form.get("paymentTermCode") ?? "") || undefined;
    await verifyInvoiceAndCreatePayable({
      invoiceId: id,
      actorId: session.userId,
      paymentTermCode,
    });
    redirect(`/accounts-payable`);
  } catch (e) {
    return jsonError(e);
  }
}
