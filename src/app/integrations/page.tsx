import { ModuleListPage } from "@/components/layout/module-list-page";
import { prisma } from "@/lib/db";
import { getOCRProvider } from "@/lib/providers/ocr";
import { getTelegramProvider } from "@/lib/providers/notifications";
import { getStorageProvider } from "@/lib/providers/storage/local-storage";
import { getGoogleWorkspaceHealth } from "@/lib/providers/google-workspace";
import { StatusBadge } from "@/components/ui/status-badge";

export default async function IntegrationsPage() {
  const settings = await prisma.integrationSetting.findMany({ orderBy: { providerKey: "asc" } });
  const [ocr, telegram, storage, google] = await Promise.all([
    getOCRProvider().getHealth(),
    getTelegramProvider().getHealth(),
    getStorageProvider().getHealth(),
    getGoogleWorkspaceHealth(),
  ]);

  const runtime = [
    { key: "ocr_runtime", name: "OCR Runtime", ...ocr, isDemo: (ocr as { isDemo?: boolean }).isDemo },
    { key: "storage", name: "Document Storage", status: storage.status, message: storage.message },
    { key: "telegram_runtime", name: "Telegram Runtime", ...telegram },
    {
      key: "google_workspace",
      name: "Google Drive + Sheets",
      status: google.status,
      message: google.message,
    },
  ];

  return (
    <ModuleListPage
      title="Integration Settings"
      description="Status jujur — Connected hanya setelah test connection berhasil."
    >
      <section className="mb-8">
        <h2 className="mb-2 font-medium">Runtime health</h2>
        <ul className="space-y-2">
          {runtime.map((r) => (
            <li key={r.key} className="flex items-center justify-between rounded border bg-white p-3 text-sm">
              <span>{r.name}</span>
              <div className="flex gap-2">
                {"isDemo" in r && r.isDemo && <StatusBadge label="DEMO" tone="warning" />}
                <StatusBadge label={r.status} tone={r.status === "CONNECTED" ? "success" : "warning"} />
              </div>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-xs text-slate-500">{ocr.message}</p>
        {"serviceAccountEmail" in google && google.serviceAccountEmail && (
          <p className="mt-1 text-xs text-slate-600">
            Google SA: <code className="rounded bg-slate-100 px-1">{google.serviceAccountEmail}</code> — share
            folder &amp; spreadsheet (Editor).
          </p>
        )}
        <p className="mt-1 text-xs text-slate-500">{google.message}</p>
      </section>
      <table className="min-w-full text-sm border rounded-xl bg-white">
        <thead className="bg-slate-50 text-left">
          <tr>
            <th className="px-4 py-2">Provider</th>
            <th className="px-4 py-2">Status DB</th>
            <th className="px-4 py-2">Last error</th>
          </tr>
        </thead>
        <tbody>
          {settings.map((s) => (
            <tr key={s.id} className="border-t">
              <td className="px-4 py-2">{s.displayName}</td>
              <td className="px-4 py-2">{s.status}</td>
              <td className="px-4 py-2">{s.lastError ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </ModuleListPage>
  );
}
