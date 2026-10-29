import { ModuleListPage } from "@/components/layout/module-list-page";
import { prisma } from "@/lib/db";
import { CreateUserForm } from "@/components/admin/create-user-form";

export default async function UsersPage() {
  const users = await prisma.user.findMany({
    include: { userRoles: { include: { role: true } }, supplier: true },
    orderBy: { username: "asc" },
  });
  const roles = await prisma.role.findMany();
  const suppliers = await prisma.supplier.findMany();

  return (
    <ModuleListPage title="User & Role Management" description="Buat user supplier oleh admin — jangan hardcode password di production.">
      <CreateUserForm roles={roles} suppliers={suppliers} />
      <table className="mt-8 min-w-full text-sm border rounded-xl bg-white">
        <thead className="bg-slate-50 text-left">
          <tr>
            <th className="px-4 py-2">Username</th>
            <th className="px-4 py-2">Nama</th>
            <th className="px-4 py-2">Roles</th>
            <th className="px-4 py-2">Supplier</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id} className="border-t">
              <td className="px-4 py-2">{u.username}</td>
              <td className="px-4 py-2">{u.fullName}</td>
              <td className="px-4 py-2">{u.userRoles.map((r) => r.role.code).join(", ")}</td>
              <td className="px-4 py-2">{u.supplier?.code ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </ModuleListPage>
  );
}
