import { describe, it, expect } from "vitest";
import { requiresHumanReview } from "@/lib/services/product-matching";

describe("product matching", () => {
  it("requires review when no candidates", () => {
    expect(requiresHumanReview([])).toBe(true);
  });
  it("requires review for ambiguous fuzzy matches", () => {
    expect(
      requiresHumanReview([
        { internalProductId: "a", sku: "A", name: "A", score: 0.7, explanation: "", matchType: "fuzzy" },
        { internalProductId: "b", sku: "B", name: "B", score: 0.65, explanation: "", matchType: "fuzzy" },
      ])
    ).toBe(true);
  });
});
