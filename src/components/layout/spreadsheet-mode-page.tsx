import { hasDatabase } from "@/lib/db";
import { AppShell } from "@/components/layout/app-shell";
import { SpreadsheetModeFallback } from "@/components/layout/spreadsheet-mode-fallback";

export function spreadsheetModeActive(): boolean {
  return !hasDatabase();
}

export function SpreadsheetModePage({ title }: { title: string }) {
  return (
    <AppShell title={title}>
      <SpreadsheetModeFallback moduleTitle={title} />
    </AppShell>
  );
}
