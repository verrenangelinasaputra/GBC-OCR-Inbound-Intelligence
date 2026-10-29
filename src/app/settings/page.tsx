import { ModuleListPage } from "@/components/layout/module-list-page";
import { prisma } from "@/lib/db";

export default async function SettingsPage() {
  const settings = await prisma.systemSetting.findMany();
  return (
    <ModuleListPage title="System Settings" description="Konfigurasi aplikasi — threshold OCR, dll via env + DB.">
      <ul className="rounded-xl border bg-white p-4 text-sm">
        <li>OCR_PROVIDER: {process.env.OCR_PROVIDER ?? "auto"}</li>
        <li>GEMINI_API_KEY: {process.env.GEMINI_API_KEY ? "✓ ter-set (server)" : "✗ belum — masih demo/manual"}</li>
        <li>GEMINI_MODEL: {process.env.GEMINI_MODEL ?? "(default flash models)"}</li>
        <li>OCR_CONFIDENCE_THRESHOLD: {process.env.OCR_CONFIDENCE_THRESHOLD ?? "0.75"}</li>
        <li>STORAGE_PROVIDER: {process.env.STORAGE_PROVIDER ?? "local"}</li>
        <li>ACCURATE_INTEGRATION_ENABLED: {process.env.ACCURATE_INTEGRATION_ENABLED ?? "false"}</li>
      </ul>
      <pre className="mt-4 rounded bg-slate-900 p-4 text-xs text-slate-200">
        {JSON.stringify(settings, null, 2)}
      </pre>
    </ModuleListPage>
  );
}
