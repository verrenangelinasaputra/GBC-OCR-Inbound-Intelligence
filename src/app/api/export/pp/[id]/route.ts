import { prisma } from "@/lib/db";
import { requireApiPermission, jsonError } from "@/lib/api/auth-context";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await requireApiPermission("purchase_orders", "EXPORT");
    const { id } = await context.params;
    const po = await prisma.purchaseOrder.findUniqueOrThrow({
      where: { id },
      include: { items: { include: { internalProduct: true } }, supplier: true },
    });
    const header = "pp_number,supplier_sku,quantity,unit,supplier_description\n";
    const rows = po.items
      .map(
        (i) =>
          `${po.ppNumber},${i.internalProduct.sku},${i.quantity.toString()},${i.unit},"${(i.supplierDescription ?? "").replace(/"/g, '""')}"`
      )
      .join("\n");
    return new Response(header + rows, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="${po.ppNumber}.csv"`,
      },
    });
  } catch (e) {
    return jsonError(e);
  }
}
