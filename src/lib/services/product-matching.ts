import { prisma } from "@/lib/db";
import { MappingStatus } from "@prisma/client";

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function similarity(a: string, b: string): number {
  const na = normalize(a);
  const nb = normalize(b);
  if (na === nb) return 1;
  if (na.includes(nb) || nb.includes(na)) return 0.85;
  const setA = new Set(na.split(" "));
  const setB = new Set(nb.split(" "));
  let inter = 0;
  for (const w of setA) if (setB.has(w)) inter++;
  const union = setA.size + setB.size - inter;
  return union === 0 ? 0 : inter / union;
}

export type MatchCandidate = {
  internalProductId: string;
  sku: string;
  name: string;
  mappingId?: string;
  score: number;
  explanation: string;
  matchType: "exact_code" | "verified_mapping" | "fuzzy";
};

export async function findProductMatches(params: {
  supplierId: string;
  supplierProductName: string;
  supplierProductCode?: string | null;
}): Promise<MatchCandidate[]> {
  const candidates: MatchCandidate[] = [];

  if (params.supplierProductCode) {
    const exact = await prisma.supplierProductMapping.findFirst({
      where: {
        supplierId: params.supplierId,
        supplierProductCode: params.supplierProductCode,
        status: MappingStatus.VERIFIED,
      },
      include: { internalProduct: true },
    });
    if (exact) {
      candidates.push({
        internalProductId: exact.internalProductId,
        sku: exact.internalProduct.sku,
        name: exact.internalProduct.name,
        mappingId: exact.id,
        score: 1,
        explanation: "Exact match supplier product code + mapping terverifikasi",
        matchType: "exact_code",
      });
      return candidates;
    }
  }

  const verifiedByName = await prisma.supplierProductMapping.findMany({
    where: {
      supplierId: params.supplierId,
      status: MappingStatus.VERIFIED,
    },
    include: { internalProduct: true },
    take: 200,
  });

  for (const m of verifiedByName) {
    const score = similarity(params.supplierProductName, m.supplierProductName);
    if (score >= 0.5) {
      candidates.push({
        internalProductId: m.internalProductId,
        sku: m.internalProduct.sku,
        name: m.internalProduct.name,
        mappingId: m.id,
        score,
        explanation: `Fuzzy match dengan mapping terverifikasi: "${m.supplierProductName}"`,
        matchType: score >= 0.95 ? "verified_mapping" : "fuzzy",
      });
    }
  }

  if (candidates.length === 0) {
    const products = await prisma.internalProduct.findMany({ where: { isActive: true }, take: 100 });
    for (const p of products) {
      const score = similarity(params.supplierProductName, p.name);
      if (score >= 0.45) {
        candidates.push({
          internalProductId: p.id,
          sku: p.sku,
          name: p.name,
          score,
          explanation: `Fuzzy match ke master produk internal`,
          matchType: "fuzzy",
        });
      }
    }
  }

  return candidates.sort((a, b) => b.score - a.score).slice(0, 5);
}

/** Skor tinggi saja tidak auto-approve — caller harus explicit approve */
export function requiresHumanReview(candidates: MatchCandidate[]): boolean {
  if (candidates.length === 0) return true;
  if (candidates.length > 1 && candidates[0].score - (candidates[1]?.score ?? 0) < 0.1) return true;
  if (candidates[0].matchType === "fuzzy" && candidates[0].score < 0.9) return true;
  return false;
}
