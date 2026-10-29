import { ModuleListPage } from "@/components/layout/module-list-page";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth/session";

export default async function NotificationsPage() {
  const session = await getSession();
  const notifications = await prisma.notification.findMany({
    where: session ? { OR: [{ userId: session.userId }, { userId: null }] } : {},
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return (
    <ModuleListPage title="Notifications" description="In-app notification center — Telegram/WhatsApp adapter terpisah.">
      <ul className="space-y-2">
        {notifications.map((n) => (
          <li key={n.id} className="rounded border bg-white p-4 text-sm">
            <p className="font-medium">{n.title}</p>
            <p className="text-slate-600">{n.body}</p>
            <p className="mt-1 text-xs text-slate-400">
              {n.channel} · {n.deliveryStatus} · {n.createdAt.toLocaleString("id-ID")}
            </p>
          </li>
        ))}
        {notifications.length === 0 && <p className="text-slate-500">Belum ada notifikasi.</p>}
      </ul>
    </ModuleListPage>
  );
}
