import { ModuleListPage } from "@/components/layout/module-list-page";
import { SpreadsheetModePage, spreadsheetModeActive } from "@/components/layout/spreadsheet-mode-page";
import { UsersAdminTabs } from "@/components/admin/users-admin-tabs";
import { Suspense } from "react";
import { getSession } from "@/lib/auth/session";
import { isInternalSheetAuthEnabled } from "@/lib/config/internal-sheet";
import { getWarehouseCredentialsSpreadsheetId } from "@/lib/config/credentials-sheet";
import { getInternalUsersTab } from "@/lib/config/internal-sheet";
import { prisma } from "@/lib/db";
import { CreateUserForm } from "@/components/admin/create-user-form";

export default async function UsersPage() {
  if (spreadsheetModeActive() && isInternalSheetAuthEnabled()) {
    const session = await getSession();
    const isSuper = session?.roles.includes("SUPER_ADMIN");
    if (!isSuper) {
      return (
        <ModuleListPage
          title="User & Role Management"
          description="Hanya Super Admin yang dapat mengelola user."
        >
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Akun Anda tidak memiliki role <strong>SUPER_ADMIN</strong>. Minta admin menambahkan role tersebut di
            kolom <code className="text-xs">roles</code> pada spreadsheet Users.
          </p>
        </ModuleListPage>
      );
    }

    return (
      <ModuleListPage
        title="User & Role Management"
        description="Warehouse: akun internal & gudang. Supplier: cek kode mapping vs nama di portal."
      >
        <p className="mb-4 text-sm text-slate-600">
          Tab <strong>Warehouse</strong>: sheet{" "}
          <a
            href={`https://docs.google.com/spreadsheets/d/${getWarehouseCredentialsSpreadsheetId()}/edit`}
            target="_blank"
            rel="noreferrer"
            className="text-blue-600 hover:underline"
          >
            {getInternalUsersTab()}
          </a>{" "}
          (<code>allowed_modules</code> dipisah <code>;</code>). Tab <strong>Supplier</strong>: cocokkan nama akun
          portal dengan kode di{" "}
          <a href="/supplier-data-mapping" className="text-blue-600 hover:underline">
            Mapping Data Supplier
          </a>
          .
        </p>
        <Suspense fallback={<p className="text-sm text-slate-500">Memuat…</p>}>
          <UsersAdminTabs currentUsername={session?.username ?? ""} />
        </Suspense>
      </ModuleListPage>
    );
  }

  if (spreadsheetModeActive()) {
    return <SpreadsheetModePage title="User & Role Management" />;
  }

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
