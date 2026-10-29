import { ModuleListPage } from "@/components/layout/module-list-page";
import { prisma } from "@/lib/db";

export default async function SuppliersPage() {
  const suppliers = await prisma.supplier.findMany({ include: { users: true } });
  return (
    <ModuleListPage title="Supplier Management" description="Kelola supplier terdaftar (SSC pilot).">
      <table className="min-w-full text-sm border rounded-xl bg-white">
        <thead className="bg-slate-50 text-left">
          <tr>
            <th className="px-4 py-2">Code</th>
            <th className="px-4 py-2">Name</th>
            <th className="px-4 py-2">Users</th>
            <th className="px-4 py-2">Active</th>
          </tr>
        </thead>
        <tbody>
          {suppliers.map((s) => (
            <tr key={s.id} className="border-t">
              <td className="px-4 py-2">{s.code}</td>
              <td className="px-4 py-2">{s.name}</td>
              <td className="px-4 py-2">{s.users.length}</td>
              <td className="px-4 py-2">{s.isActive ? "Yes" : "No"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </ModuleListPage>
  );
}
