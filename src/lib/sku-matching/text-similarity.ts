export function normalizeProductName(text: string | null | undefined): string {
  return String(text ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenJaccard(na: string, nb: string): number {
  const setA = new Set(na.split(" ").filter(Boolean));
  const setB = new Set(nb.split(" ").filter(Boolean));
  let inter = 0;
  for (const w of setA) if (setB.has(w)) inter++;
  const union = setA.size + setB.size - inter;
  return union === 0 ? 0 : inter / union;
}

/** Skor kemiripan nama; substring pendek (mis. "BOTOL") tidak lagi otomatis 92%. */
export function productNameSimilarity(a: string, b: string): number {
  const na = normalizeProductName(a);
  const nb = normalizeProductName(b);
  if (!na || !nb) return 0;
  if (na === nb) return 1;

  const jaccard = tokenJaccard(na, nb);

  if (na.includes(nb) || nb.includes(na)) {
    const shorter = na.length <= nb.length ? na : nb;
    const longer = na.length > nb.length ? na : nb;
    const coverage = shorter.length / longer.length;
    const substringScore = 0.35 + 0.65 * coverage;
    return Math.max(jaccard, substringScore);
  }

  return jaccard;
}
