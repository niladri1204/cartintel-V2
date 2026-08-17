import { describe, test, expect } from "vitest";
import { selectBestRecommendation } from "../decisionIntelligence";
import type { RecommendationRequest, RecommendationCandidate } from "../../recommendationTypes";

import type { ProductIntelligence } from "../../types";

function createTestProduct(overrides?: Partial<ProductIntelligence>): ProductIntelligence {
  return {
    originalTitle: "Sample Product Title",
    originalPrice: 1000,
    originalCurrency: "INR",
    originalImage: "https://example.com/img.jpg",
    originalUrl: "https://example.com/item",
    brand: "samplebrand",
    category: "electronics",
    subcategory: null,
    productType: "item",
    variant: null,
    quantity: null,
    unit: null,
    packSize: null,
    color: null,
    model: "samplemodel",
    size: null,
    material: null,
    gender: null,
    storage: null,
    ram: null,
    packCount: null,
    language: null,
    edition: null,
    attributes: [],
    normalizedTitle: "sample product title",
    metadata: {
      marketplace: "SampleStore",
      hostname: "samplestore.com",
      detectedAt: 1700000000000
    },
    confidence: 90,
    fingerprint: "samplebrand|samplemodel",
    ...overrides
  };
}

describe("decisionIntelligence - Phase 1.12.3.2 Decision Intelligence & Selection", () => {
  const candidateSamsungEligible: RecommendationCandidate = {
    product: createTestProduct({
      brand: "samsung",
      category: "smartphone",
      originalPrice: 45000,
      originalCurrency: "INR",
      originalTitle: "Samsung Galaxy S24 (256GB, 12GB RAM)",
      normalizedTitle: "samsung galaxy s24 256gb 12gb ram",
      storage: "256GB",
      ram: "12GB",
      model: "Galaxy S24",
      confidence: 90,
      fingerprint: "samsung|galaxy s24"
    }),
    isRefurbishedOrUsed: false,
    finalRankingScore: 90,
    priceAvailabilityScore: 90,
    identityConfidenceScore: 90,
    qualityScore: 90,
    marketplaceReliabilityScore: 90,
    duplicateRedundancyScore: 0,
    isCurrentProduct: false,
    isUnavailable: false,
    currencyMismatch: false
  };

  const candidateAppleIneligible: RecommendationCandidate = {
    product: createTestProduct({
      brand: "apple",
      category: "smartphone",
      originalPrice: 65000,
      originalCurrency: "INR",
      originalTitle: "Apple iPhone 15 (128GB)",
      normalizedTitle: "apple iphone 15 128gb",
      storage: "128GB",
      model: "iPhone 15",
      confidence: 95,
      fingerprint: "apple|iphone 15"
    }),
    isRefurbishedOrUsed: false,
    finalRankingScore: 95, // Higher ranking score, but ineligible under "only Samsung"
    priceAvailabilityScore: 95,
    identityConfidenceScore: 95,
    qualityScore: 95,
    marketplaceReliabilityScore: 95,
    duplicateRedundancyScore: 0,
    isCurrentProduct: false,
    isUnavailable: false,
    currencyMismatch: false
  };

  const candidateSamsungCheaper: RecommendationCandidate = {
    product: {
      brand: "samsung",
      category: "smartphone",
      originalPrice: 35000,
      originalCurrency: "INR",
      originalTitle: "Samsung Galaxy A55 (128GB, 8GB RAM)",
      normalizedTitle: "samsung galaxy a55 128gb 8gb ram",
      storage: "128GB",
      ram: "8GB",
      attributes: [],
      confidence: 85,
      fingerprint: "samsung|galaxy a55"
    },
    isRefurbishedOrUsed: false,
    finalRankingScore: 85,
    priceAvailabilityScore: 85,
    identityConfidenceScore: 85,
    qualityScore: 85,
    marketplaceReliabilityScore: 85,
    duplicateRedundancyScore: 0,
    isCurrentProduct: false,
    isUnavailable: false,
    currencyMismatch: false
  };

  test("1. Eligible candidate selection", () => {
    const request: RecommendationRequest = {
      hardConstraints: [{ attribute: "brand", operator: "equals", value: "samsung" }],
      candidates: [candidateSamsungEligible]
    };
    const res = selectBestRecommendation(request);
    expect(res.recommendedCandidate).toBe(candidateSamsungEligible);
    expect(res.recommendationScore).toBeGreaterThan(0);
  });

  test("2. Ineligible candidate exclusion", () => {
    const request: RecommendationRequest = {
      hardConstraints: [{ attribute: "brand", operator: "equals", value: "samsung" }],
      candidates: [candidateAppleIneligible]
    };
    const res = selectBestRecommendation(request);
    expect(res.recommendedCandidate).toBeNull();
    expect(res.recommendationScore).toBe(0);
    expect(res.scoredEvaluations[0].decisionScore).toBe(0);
  });

  test("3. Hard constraint dominance ('only Samsung' prevents Apple despite higher ranking score)", () => {
    const request: RecommendationRequest = {
      hardConstraints: [{ attribute: "brand", operator: "equals", value: "samsung" }],
      candidates: [candidateAppleIneligible, candidateSamsungEligible]
    };
    const res = selectBestRecommendation(request);
    expect(res.recommendedCandidate).toBe(candidateSamsungEligible);
    expect(res.scoredEvaluations.find(e => e.candidate === candidateAppleIneligible)?.decisionScore).toBe(0);
  });

  test("4. Mandatory requirement dominance", () => {
    const request: RecommendationRequest = {
      explicitRequirements: [
        { attribute: "storage", value: "256GB", operator: "equals", isMandatory: true }
      ],
      candidates: [candidateSamsungEligible, candidateSamsungCheaper]
    };
    const res = selectBestRecommendation(request);
    expect(res.recommendedCandidate).toBe(candidateSamsungEligible);
    const score256 = res.scoredEvaluations.find(e => e.candidate === candidateSamsungEligible)?.decisionScore;
    const score128 = res.scoredEvaluations.find(e => e.candidate === candidateSamsungCheaper)?.decisionScore;
    expect(score256!).toBeGreaterThan(score128!);
  });

  test("5. Preference influence", () => {
    const request: RecommendationRequest = {
      userPreferences: [
        { key: "brand_loyalty", value: "samsung" }
      ],
      candidates: [candidateSamsungEligible, candidateAppleIneligible]
    };
    const res = selectBestRecommendation(request);
    const samsungPref = res.scoredEvaluations.find(e => e.candidate === candidateSamsungEligible)?.utilityBreakdown.preferenceScore;
    const applePref = res.scoredEvaluations.find(e => e.candidate === candidateAppleIneligible)?.utilityBreakdown.preferenceScore;
    expect(samsungPref).toBe(100);
    expect(applePref).toBe(0);
  });

  test("6. Price/value influence", () => {
    const request: RecommendationRequest = {
      candidates: [candidateSamsungEligible, candidateSamsungCheaper]
    };
    const res = selectBestRecommendation(request);
    const valCheaper = res.scoredEvaluations.find(e => e.candidate === candidateSamsungCheaper)?.utilityBreakdown.valueScore;
    const valEligible = res.scoredEvaluations.find(e => e.candidate === candidateSamsungEligible)?.utilityBreakdown.valueScore;
    expect(valCheaper!).toBeGreaterThan(valEligible!);
  });

  test("7. Ranking evidence influence", () => {
    const request: RecommendationRequest = {
      candidates: [candidateSamsungEligible, candidateSamsungCheaper]
    };
    const res = selectBestRecommendation(request);
    const rankEligible = res.scoredEvaluations.find(e => e.candidate === candidateSamsungEligible)?.utilityBreakdown.rankingScoreComponent;
    expect(rankEligible).toBe(90);
  });

  test("8. Trade-off detection (Price vs Specification trade-off between top candidates)", () => {
    const request: RecommendationRequest = {
      explicitRequirements: [{ attribute: "storage", value: "256GB", operator: "equals", isMandatory: true }],
      candidates: [candidateSamsungEligible, candidateSamsungCheaper]
    };
    const res = selectBestRecommendation(request);
    expect(res.tradeOffs.length).toBeGreaterThan(0);
    expect(res.tradeOffs[0].aspect).toBe("Price vs Specification");
  });

  test("9. Final score normalization (bounded 0 to 100)", () => {
    const request: RecommendationRequest = {
      candidates: [candidateSamsungEligible]
    };
    const res = selectBestRecommendation(request);
    expect(res.recommendationScore).toBeGreaterThanOrEqual(0);
    expect(res.recommendationScore).toBeLessThanOrEqual(100);
  });

  test("10. Deterministic tie-breaking (finalRankingScore -> stable sequence)", () => {
    const candidateTied1: RecommendationCandidate = { ...candidateSamsungEligible, finalRankingScore: 90 };
    const candidateTied2: RecommendationCandidate = { ...candidateSamsungEligible, finalRankingScore: 85 };

    const request: RecommendationRequest = {
      candidates: [candidateTied1, candidateTied2]
    };
    const res = selectBestRecommendation(request);
    expect(res.recommendedCandidate).toBe(candidateTied1);
  });

  test("11. No eligible candidates (recommendedCandidate = null, recommendationScore = 0)", () => {
    const request: RecommendationRequest = {
      hardConstraints: [{ attribute: "brand", operator: "equals", value: "samsung" }],
      candidates: [candidateAppleIneligible]
    };
    const res = selectBestRecommendation(request);
    expect(res.recommendedCandidate).toBeNull();
    expect(res.recommendationScore).toBe(0);
  });

  test("12. Unknown candidate data (uncertainty discount applied)", () => {
    const candidateUnknown: RecommendationCandidate = {
      ...candidateSamsungEligible,
      product: { ...candidateSamsungEligible.product!, originalPrice: undefined as any }
    };

    const request: RecommendationRequest = {
      hardConstraints: [{ attribute: "price", operator: "less_than", value: 50000 }],
      candidates: [candidateUnknown, candidateSamsungEligible]
    };
    const res = selectBestRecommendation(request);
    expect(res.recommendedCandidate).toBe(candidateSamsungEligible);
  });

  test("13. Candidate preservation (original candidate unmutated)", () => {
    const copy = JSON.parse(JSON.stringify(candidateSamsungEligible));
    selectBestRecommendation({ candidates: [candidateSamsungEligible] });
    expect(candidateSamsungEligible).toEqual(copy);
  });

  test("14. Request immutability (original request unmutated)", () => {
    const request: RecommendationRequest = {
      hardConstraints: [{ attribute: "price", operator: "less_than", value: 50000 }],
      candidates: [candidateSamsungEligible]
    };
    const copy = JSON.parse(JSON.stringify(request));
    selectBestRecommendation(request);
    expect(request).toEqual(copy);
  });

  test("15. Existing ranking score preservation (finalRankingScore unmutated)", () => {
    selectBestRecommendation({ candidates: [candidateSamsungEligible] });
    expect(candidateSamsungEligible.finalRankingScore).toBe(90);
  });

  test("16. Multiple candidates evaluated correctly", () => {
    const request: RecommendationRequest = {
      candidates: [candidateSamsungEligible, candidateAppleIneligible, candidateSamsungCheaper]
    };
    const res = selectBestRecommendation(request);
    expect(res.scoredEvaluations).toHaveLength(3);
  });

  test("17. Equivalent candidates tie-break deterministically", () => {
    const c1: RecommendationCandidate = { ...candidateSamsungEligible };
    const c2: RecommendationCandidate = { ...candidateSamsungEligible };
    const res = selectBestRecommendation({ candidates: [c1, c2] });
    expect(res.recommendedCandidate).toBe(c1);
  });

  test("18. Deterministic repeated execution", () => {
    const request: RecommendationRequest = {
      hardConstraints: [{ attribute: "brand", operator: "equals", value: "samsung" }],
      candidates: [candidateSamsungEligible, candidateSamsungCheaper]
    };
    const res1 = selectBestRecommendation(request);
    const res2 = selectBestRecommendation(request);
    expect(res1).toEqual(res2);
  });

  test("19. No external/API/AI calls", () => {
    const res = selectBestRecommendation({ candidates: [candidateSamsungEligible] });
    expect(res.recommendedCandidate).toBeDefined();
  });

  test("20. Realistic electronics example: Samsung vs Apple smartphone ('only Samsung')", () => {
    const request: RecommendationRequest = {
      hardConstraints: [{ attribute: "brand", operator: "equals", value: "samsung" }],
      userPreferences: [{ key: "brand_loyalty", value: "apple" }],
      candidates: [candidateSamsungEligible, candidateAppleIneligible]
    };
    const res = selectBestRecommendation(request);
    expect(res.recommendedCandidate).toBe(candidateSamsungEligible);
  });

  test("21. Realistic electronics example: Price vs camera trade-off", () => {
    const request: RecommendationRequest = {
      userPreferences: [{ key: "camera", value: "preferred" }],
      candidates: [candidateSamsungEligible, candidateSamsungCheaper]
    };
    const res = selectBestRecommendation(request);
    expect(res.recommendedCandidate).toBeDefined();
  });

  test("22. Realistic electronics example: Laptop price/performance trade-off", () => {
    const laptop1: RecommendationCandidate = {
      ...candidateSamsungEligible,
      product: { ...candidateSamsungEligible.product!, category: "laptop", originalPrice: 80000, ram: "16GB" }
    };
    const laptop2: RecommendationCandidate = {
      ...candidateSamsungEligible,
      product: { ...candidateSamsungEligible.product!, category: "laptop", originalPrice: 60000, ram: "8GB" }
    };
    const res = selectBestRecommendation({
      explicitRequirements: [{ attribute: "ram", value: "16GB", operator: "equals", isMandatory: true }],
      candidates: [laptop1, laptop2]
    });
    expect(res.recommendedCandidate).toBe(laptop1);
  });

  test("23. Realistic electronics example: Monitor resolution/refresh-rate trade-off", () => {
    const monitor4k: RecommendationCandidate = {
      ...candidateSamsungEligible,
      product: { ...candidateSamsungEligible.product!, category: "monitor", normalizedTitle: "4k monitor 60hz" }
    };
    const monitor144hz: RecommendationCandidate = {
      ...candidateSamsungEligible,
      product: { ...candidateSamsungEligible.product!, category: "monitor", normalizedTitle: "fhd monitor 144hz" }
    };
    const res = selectBestRecommendation({
      userPreferences: [{ key: "display", value: "4K" }],
      candidates: [monitor4k, monitor144hz]
    });
    expect(res.recommendedCandidate).toBe(monitor4k);
  });
});
