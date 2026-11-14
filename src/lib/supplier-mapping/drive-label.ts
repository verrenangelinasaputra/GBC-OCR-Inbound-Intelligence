export function sanitizeDriveFileSegment(value: string): string {
  return value
    .trim()
    .replace(/[\\/:*?"<>|]/g, " ")
    .replace(/\s+/g, " ")
    .slice(0, 80);
}
