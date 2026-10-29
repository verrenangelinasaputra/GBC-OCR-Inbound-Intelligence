import { ModuleListPage } from "@/components/layout/module-list-page";
import { prisma } from "@/lib/db";
import Link from "next/link";

export default async function GoodsReceivingPage() {
  const approved = await prisma.purchaseOrder.findMany({
    where: { status: "APPROVED" },
    include: { supplier: true, receipts: true },
    orderBy: { updatedAt: "desc" },
  });
  return (
    <ModuleListPage title="Goods Receiving" description="Penerimaan barang fisik — partial delivery didukung.">
      <ul className="space-y-2">
        {approved.map((po) => (
          <li key={po.id} className="flex justify-between rounded border bg-white p-4 text-sm">
            <span>
              {po.ppNumber} — {po.supplier.name} ({po.receipts.length} receipt(s))
            </span>
            <Link href={`/purchase-orders/${po.id}`} className="text-blue-600">
              Record receiving
            </Link>
          </li>
        ))}
      </ul>
    </ModuleListPage>
  );
}
