const readyTabs = new Set<string>();

export function tabSetupCacheKey(spreadsheetId: string, tab: string, marker = "ready"): string {
  return `${spreadsheetId}::${tab}::${marker}`;
}

export function isTabSetupCached(key: string): boolean {
  return readyTabs.has(key);
}

export function markTabSetupCached(key: string): void {
  readyTabs.add(key);
}
