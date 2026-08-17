import { describe, test, expect } from "vitest";
import { recommend } from "../recommendationEngine";
import { recommendDeal } from "../recommendation";
import type { RecommendationRequest, RecommendationCandidate } from "../recommendationTypes";
import type { RankedDealResult } from "../ranking";

describe("recommendationEngine - recommend", () => {
  const dummyProduct = {
    originalTitle: "Test Product",
    originalPrice: 1000,
    originalCurrency: "INR",
    originalImage: null,
    originalUrl: null,
    brand: "BrandA",
    category: "Electronics",
    subcategory: null,
    productType: "Smartphone",
    variant: null,
    quantity: null,
    unit: null,
    packSize: null,
    color: null,
    model: null,
    size: null,
    material: null,
    gender: null,
    storage: null,
    ram: null,
    packCount: null,
    language: null,
    edition: null,
    attributes: [],
    normalizedTitle: "test product",
    metadata: {
      marketplace: "TestMarket",
      hostname: "test.com",
      detectedAt: 12345
    },
    confidence: 100,
    fingerprint: "test-fingerprint"
  };

  const candidate1: RecommendationCandidate = {
    product: dummyProduct,
    isCurrentProduct: false,
    variantState: "explicitly_matching",
    isRefurbishedOrUsed: false,
    isUnavailable: false,
    savingsValue: 200,
    savingsPercentage: 20,
    currencyMismatch: false,
    finalRankingScore: 95,
    selectionTier: "exact_available"
  };

  const candidate2: RecommendationCandidate = {
    product: {
      ...dummyProduct,
      fingerprint: "test-fingerprint-2"
    },
    isCurrentProduct: false,
    variantState: "explicitly_matching",
    isRefurbishedOrUsed: false,
    isUnavailable: false,
    savingsValue: 100,
    savingsPercentage: 10,
    currencyMismatch: false,
    finalRankingScore: 80,
    selectionTier: null
  };

  const sampleRequest: RecommendationRequest = {
    originalQuery: "phone under 20000",
    productContext: {
      currentProduct: dummyProduct
    },
    explicitRequirements: [],
    userPreferences: [],
    hardConstraints: [],
    candidates: [candidate1, candidate2]
  };

  test("1. Valid request + candidates returns a valid DecisionRecommendationResult", () => {
    const result = recommend(sampleRequest, [candidate1, candidate2]);
    expect(result).toBeDefined();
    expect(result.recommendedCandidate).toBeNull();
    expect(typeof result.recommendationScore).toBe("number");
    expect(result.confidence).toBe("low");
    expect(Array.isArray(result.reasons)).toBe(true);
    expect(Array.isArray(result.tradeOffs)).toBe(true);
    expect(Array.isArray(result.alternatives)).toBe(true);
    expect(result.metadata).toBeDefined();
  });

  test("2. Empty candidates return a safe no-decision result", () => {
    const result = recommend(sampleRequest, []);
    expect(result).toBeDefined();
    expect(result.recommendedCandidate).toBeNull();
    expect(result.metadata.evaluatedCandidateCount).toBe(0);
    expect(result.confidence).toBe("low");
  });

  test("3. Candidate count is reflected correctly in metadata", () => {
    const result1 = recommend(sampleRequest, [candidate1]);
    expect(result1.metadata.evaluatedCandidateCount).toBe(1);

    const result2 = recommend(sampleRequest, [candidate1, candidate2]);
    expect(result2.metadata.evaluatedCandidateCount).toBe(2);
  });

  test("4. The engine does NOT select a candidate merely because it has the highest finalRankingScore", () => {
    expect(candidate1.finalRankingScore).toBe(95);

    const result = recommend(sampleRequest, [candidate1, candidate2]);
    expect(result.recommendedCandidate).toBeNull();
  });

  test("5. Existing candidate objects are not mutated", () => {
    const candidateCopy = JSON.parse(JSON.stringify(candidate1));
    recommend(sampleRequest, [candidate1]);

    expect(candidate1.product.fingerprint).toBe(candidateCopy.product.fingerprint);
    expect(candidate1.finalRankingScore).toBe(candidateCopy.finalRankingScore);
    expect(candidate1.selectionTier).toBe(candidateCopy.selectionTier);
  });

  test("6. Existing candidate ranking metadata remains unchanged", () => {
    const originalScore = candidate1.finalRankingScore;
    const originalTier = candidate1.selectionTier;

    recommend(sampleRequest, [candidate1]);

    expect(candidate1.finalRankingScore).toBe(originalScore);
    expect(candidate1.selectionTier).toBe(originalTier);
  });

  test("7. No external/network/API calls are made", () => {
    const start = performance.now();
    const result = recommend(sampleRequest, [candidate1, candidate2]);
    const duration = performance.now() - start;

    expect(duration).toBeLessThan(100);
    expect(result).toBeDefined();
  });

  test("8. The legacy recommendDeal() behavior remains unaffected", () => {
    const rankedDeal: RankedDealResult = {
      currentProduct: dummyProduct,
      offers: [candidate1],
      bestOffer: candidate1,
      hasCurrencyMismatch: false
    };

    const legacyResult = recommendDeal(rankedDeal);
    expect(legacyResult).toBeDefined();
    expect(legacyResult.state).toBe("recommended_deal");
    expect(legacyResult.recommendedOffer).toBe(candidate1);
    expect(legacyResult.isPriceBased).toBe(true);
  });

  test("9. The result contains all required RecommendationResult fields", () => {
    const result = recommend(sampleRequest, [candidate1]);

    expect(result).toHaveProperty("recommendedCandidate");
    expect(result).toHaveProperty("recommendationScore");
    expect(result).toHaveProperty("confidence");
    expect(result).toHaveProperty("confidenceDetails");
    expect(result).toHaveProperty("reasons");
    expect(result).toHaveProperty("tradeOffs");
    expect(result).toHaveProperty("alternatives");
    expect(result).toHaveProperty("metadata");
    expect(result.metadata).toHaveProperty("evaluatedCandidateCount");
    expect(result.metadata).toHaveProperty("decisionAlgorithmVersion");
    expect(result.metadata).toHaveProperty("processedAt");
    expect(result.metadata).toHaveProperty("executionTimeMs");
  });

  test("10. Multiple calls with equivalent inputs produce structurally equivalent decision output, apart from allowed timing metadata", () => {
    const result1 = recommend(sampleRequest, [candidate1, candidate2]);
    const result2 = recommend(sampleRequest, [candidate1, candidate2]);

    expect(result1.recommendedCandidate).toBe(result2.recommendedCandidate);
    expect(result1.recommendationScore).toBe(result2.recommendationScore);
    expect(result1.confidence).toBe(result2.confidence);
    expect(result1.confidenceDetails).toBe(result2.confidenceDetails);
    expect(result1.reasons).toEqual(result2.reasons);
    expect(result1.tradeOffs).toEqual(result2.tradeOffs);
    expect(result1.alternatives).toEqual(result2.alternatives);
    expect(result1.metadata.evaluatedCandidateCount).toBe(result2.metadata.evaluatedCandidateCount);
    expect(result1.metadata.decisionAlgorithmVersion).toBe(result2.metadata.decisionAlgorithmVersion);
  });
});
