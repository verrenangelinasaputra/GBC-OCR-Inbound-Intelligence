import { ModuleListPage } from "@/components/layout/module-list-page";
import { prisma } from "@/lib/db";

export default async function MasterPricesPage() {
  const prices = await prisma.purchasePriceHistory.findMany({
    include: { internalProduct: true, supplier: true },
    orderBy: { effectiveFrom: "desc" },
    take: 50,
  });
  return (
    <ModuleListPage title="Master Harga Beli" description="Harga beli per SKU/supplier — effective date aware.">
      <table className="min-w-full text-sm border rounded-xl bg-white">
        <thead className="bg-slate-50 text-left">
          <tr>
            <th className="px-3 py-2">SKU</th>
            <th className="px-3 py-2">Supplier</th>
            <th className="px-3 py-2">Unit</th>
            <th className="px-3 py-2">Price</th>
            <th className="px-3 py-2">Effective</th>
            <th className="px-3 py-2">Status</th>
          </tr>
        </thead>
        <tbody>
          {prices.map((p) => (
            <tr key={p.id} className="border-t">
              <td className="px-3 py-2">{p.internalProduct.sku}</td>
              <td className="px-3 py-2">{p.supplier.code}</td>
              <td className="px-3 py-2">{p.unit}</td>
              <td className="px-3 py-2">
                {p.currency} {p.unitPrice.toString()}
              </td>
              <td className="px-3 py-2">{p.effectiveFrom.toISOString().slice(0, 10)}</td>
              <td className="px-3 py-2">{p.verificationStatus}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </ModuleListPage>
  );
}
