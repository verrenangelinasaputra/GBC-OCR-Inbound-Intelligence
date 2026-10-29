import { AppShell } from "@/components/layout/app-shell";

export function ModuleListPage({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <AppShell title={title}>
      {description && <p className="mb-4 text-sm text-slate-600">{description}</p>}
      {children}
    </AppShell>
  );
}
