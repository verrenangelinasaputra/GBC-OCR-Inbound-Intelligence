/** Nama file aman untuk header `Content-Disposition: attachment`. */
export function contentDispositionAttachment(fileName: string): string {
  const trimmed = String(fileName || "download").trim() || "download";
  const safeAscii = trimmed.replace(/[\r\n"\\]/g, "_");
  const encoded = encodeURIComponent(trimmed).replace(/['()]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
  return `attachment; filename="${safeAscii}"; filename*=UTF-8''${encoded}`;
}
