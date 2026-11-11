const REVISION_SEP = "|||";

/** Beberapa URL revisi disimpan dalam satu sel, dipisah `|||`. */
export function parseRevisionLinks(raw: string | undefined | null): string[] {
  const text = String(raw ?? "").trim();
  if (!text) return [];
  if (text.includes(REVISION_SEP)) {
    return text
      .split(REVISION_SEP)
      .map((s) => s.trim())
      .filter((s) => s.startsWith("http"));
  }
  if (text.startsWith("http")) return [text];
  return [];
}

export function appendRevisionLink(existing: string | undefined | null, newUrl: string): string {
  const links = parseRevisionLinks(existing);
  links.push(newUrl.trim());
  return links.join(` ${REVISION_SEP} `);
}

export function revisionLinkCount(raw: string | undefined | null): number {
  return parseRevisionLinks(raw).length;
}
