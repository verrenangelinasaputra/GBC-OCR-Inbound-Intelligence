import { ModuleListPage } from "@/components/layout/module-list-page";
import { prisma } from "@/lib/db";
import Link from "next/link";

export default async function SkuMappingPage() {
  const [pendingLines, mappings] = await Promise.all([
    prisma.ocrLineItem.findMany({
      where: { mappingStatus: { in: ["PENDING", "NEEDS_REVIEW"] } },
      include: { document: { include: { supplier: true } } },
      take: 30,
    }),
    prisma.supplierProductMapping.findMany({
      include: { supplier: true, internalProduct: true },
      orderBy: { updatedAt: "desc" },
      take: 30,
    }),
  ]);

  return (
    <ModuleListPage title="Product SKU Mapping" description="Engine mapping nama supplier → SKU internal GBC.">
      <h2 className="mb-2 font-medium">Review queue — unmatched lines</h2>
      <ul className="mb-8 space-y-2 text-sm">
        {pendingLines.map((l) => (
          <li key={l.id} className="rounded border bg-white p-3">
            {l.supplierProductName} — {l.document.supplier.name}{" "}
            <Link href={`/surat-jalan/${l.documentId}`} className="text-blue-600">
              Review doc
            </Link>
          </li>
        ))}
      </ul>
      <h2 className="mb-2 font-medium">Master mappings</h2>
      <table className="min-w-full text-sm border rounded-lg overflow-hidden bg-white">
        <thead className="bg-slate-50 text-left">
          <tr>
            <th className="px-3 py-2">Supplier</th>
            <th className="px-3 py-2">Nama supplier</th>
            <th className="px-3 py-2">SKU internal</th>
            <th className="px-3 py-2">Status</th>
          </tr>
        </thead>
        <tbody>
          {mappings.map((m) => (
            <tr key={m.id} className="border-t">
              <td className="px-3 py-2">{m.supplier.code}</td>
              <td className="px-3 py-2">{m.supplierProductName}</td>
              <td className="px-3 py-2">{m.internalProduct.sku}</td>
              <td className="px-3 py-2">{m.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </ModuleListPage>
  );
}
