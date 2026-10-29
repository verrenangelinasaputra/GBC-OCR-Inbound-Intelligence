import { ModuleListPage } from "@/components/layout/module-list-page";
import { prisma } from "@/lib/db";

export default async function AuditLogsPage() {
  const logs = await prisma.auditLog.findMany({
    include: { actor: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return (
    <ModuleListPage title="Audit Logs" description="Audit trail — tidak dapat dihapus user biasa.">
      <table className="min-w-full text-xs border rounded-xl bg-white">
        <thead className="bg-slate-50 text-left">
          <tr>
            <th className="px-2 py-2">Waktu</th>
            <th className="px-2 py-2">Actor</th>
            <th className="px-2 py-2">Action</th>
            <th className="px-2 py-2">Entity</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((l) => (
            <tr key={l.id} className="border-t">
              <td className="px-2 py-2">{l.createdAt.toISOString()}</td>
              <td className="px-2 py-2">{l.actor?.username ?? "system"}</td>
              <td className="px-2 py-2">{l.action}</td>
              <td className="px-2 py-2">
                {l.entityType}:{l.entityId.slice(0, 8)}…
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </ModuleListPage>
  );
}
