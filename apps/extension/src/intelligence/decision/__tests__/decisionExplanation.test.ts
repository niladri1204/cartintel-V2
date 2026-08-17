import { describe, test, expect } from "vitest";
import { buildExplainableRecommendation } from "../decisionExplanation";
import { buildRecommendationRequest } from "../../intent/recommendationRequestBuilder";
import type { RecommendationCandidate, RecommendationRequest } from "../../recommendationTypes";

describe("decisionExplanation - Phase 1.12.3.3 Explainable Recommendation & End-to-End Validation", () => {
  const candidateSamsung: RecommendationCandidate = {
    product: {
      brand: "samsung",
      category: "smartphone",
      originalPrice: 45000,
      originalCurrency: "INR",
      originalTitle: "Samsung Galaxy S24 (256GB, 12GB RAM)",
      normalizedTitle: "samsung galaxy s24 256gb 12gb ram",
      storage: "256GB",
      ram: "12GB",
      model: "Galaxy S24",
      color: "Black",
      size: "6.2 inch",
      attributes: ["AMOLED", "120Hz"],
      confidence: 90,
      fingerprint: "samsung|galaxy s24",
      metadata: {
        marketplace: "Amazon",
        hostname: "amazon.in",
        detectedAt: Date.now()
      }
    },
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

  const candidateSamsungRunnerUp: RecommendationCandidate = {
    product: {
      brand: "samsung",
      category: "smartphone",
      originalPrice: 35000,
      originalCurrency: "INR",
      originalTitle: "Samsung Galaxy A55 (128GB, 8GB RAM)",
      normalizedTitle: "samsung galaxy a55 128gb 8gb ram",
      storage: "128GB",
      ram: "8GB",
      model: "Galaxy A55",
      confidence: 85,
      fingerprint: "samsung|galaxy a55",
      metadata: {
        marketplace: "Flipkart",
        hostname: "flipkart.com",
        detectedAt: Date.now()
      }
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

  const candidateAppleIneligible: RecommendationCandidate = {
    product: {
      brand: "apple",
      category: "smartphone",
      originalPrice: 65000,
      originalCurrency: "INR",
      originalTitle: "Apple iPhone 15 (128GB)",
      normalizedTitle: "apple iphone 15 128gb",
      storage: "128GB",
      confidence: 95,
      fingerprint: "apple|iphone 15"
    },
    isRefurbishedOrUsed: false,
    finalRankingScore: 95,
    priceAvailabilityScore: 95,
    identityConfidenceScore: 95,
    qualityScore: 95,
    marketplaceReliabilityScore: 95,
    duplicateRedundancyScore: 0,
    isCurrentProduct: false,
    isUnavailable: false,
    currencyMismatch: false
  };

  test("1. Winner explanation (evidence-based reasons generated for winner)", () => {
    const req = buildRecommendationRequest("Samsung phone under ₹50,000 with 256GB storage");
    const res = buildExplainableRecommendation(req, [candidateSamsung, candidateSamsungRunnerUp]);

    expect(res.recommendedCandidate).toBe(candidateSamsung);
    expect(res.recommendationScore).toBeGreaterThan(0);
    expect(res.reasons.length).toBeGreaterThan(0);
    expect(res.metadata.decisionAlgorithmVersion).toBe("1.12.3");
  });

  test("2. Requirement reasons (matched explicit requirements included)", () => {
    const req = buildRecommendationRequest("Phone with 256GB storage");
    const res = buildExplainableRecommendation(req, [candidateSamsung]);

    const reqReason = res.reasons.find(r => r.message.includes("explicit requirements"));
    expect(reqReason).toBeDefined();
    expect(reqReason?.message).toContain("storage: 256GB");
  });

  test("3. Preference reasons (strongly matched soft preferences included)", () => {
    const req = buildRecommendationRequest("Prefer Samsung phone");
    const res = buildExplainableRecommendation(req, [candidateSamsung]);

    const prefReason = res.reasons.find(r => r.type === "preference_match");
    expect(prefReason).toBeDefined();
    expect(prefReason?.message).toContain("brand_loyalty: samsung");
  });

  test("4. Price/value reasons (competitive pricing / savings included)", () => {
    const req = buildRecommendationRequest("Samsung phone");
    const res = buildExplainableRecommendation(req, [candidateSamsung, candidateSamsungRunnerUp]);

    const priceReason = res.reasons.find(r => r.type === "price");
    expect(priceReason).toBeDefined();
  });

  test("5. Ranking/quality evidence (merchant reliability / quality included)", () => {
    const req = buildRecommendationRequest("Samsung phone");
    const res = buildExplainableRecommendation(req, [candidateSamsung]);

    const qualReason = res.reasons.find(r => r.type === "reputation");
    expect(qualReason).toBeDefined();
    expect(qualReason?.message).toContain("Amazon");
  });

  test("6. Missing evidence handling (reasons omitted when evidence unavailable)", () => {
    const req = buildRecommendationRequest("phone"); // no preferences, no explicit specs
    const minimalCandidate: RecommendationCandidate = {
      product: {
        brand: null,
        category: "smartphone",
        originalPrice: null,
        originalCurrency: null,
        originalTitle: "Smartphone",
        normalizedTitle: "smartphone",
        storage: null,
        ram: null,
        attributes: [],
        confidence: 50,
        fingerprint: "generic|smartphone"
      },
      isRefurbishedOrUsed: false,
      finalRankingScore: 50,
      priceAvailabilityScore: 50,
      identityConfidenceScore: 50,
      qualityScore: 50,
      marketplaceReliabilityScore: 50,
      duplicateRedundancyScore: 0,
      isCurrentProduct: false,
      isUnavailable: false,
      currencyMismatch: false
    };

    const res = buildExplainableRecommendation(req, [minimalCandidate]);
    const prefReason = res.reasons.find(r => r.type === "preference_match");
    expect(prefReason).toBeUndefined();
  });

  test("7. Confidence levels ('high', 'medium', 'low')", () => {
    const req = buildRecommendationRequest("Samsung phone");
    const res = buildExplainableRecommendation(req, [candidateSamsung]);

    expect(res.confidence).toBe("high");
    expect(res.confidenceDetails?.factors.dataCompleteness).toBeGreaterThan(0.5);
    expect(res.confidenceDetails?.factors.identityCertainty).toBe(0.9);
  });

  test("8. Alternatives comparison (eligible runner-up candidate included)", () => {
    const req = buildRecommendationRequest("Samsung phone");
    const res = buildExplainableRecommendation(req, [candidateSamsung, candidateSamsungRunnerUp]);

    expect(res.recommendedCandidate).toBe(candidateSamsungRunnerUp);
    expect(res.alternatives).toHaveLength(1);
    expect(res.alternatives[0].candidate).toBe(candidateSamsung);
    expect(res.alternatives[0].comparisonMessage).toContain("Samsung Galaxy S24");
  });

  test("9. Score differences (calculated from decision scores)", () => {
    const req = buildRecommendationRequest("Samsung phone");
    const res = buildExplainableRecommendation(req, [candidateSamsung, candidateSamsungRunnerUp]);

    expect(res.alternatives[0].scoreDifference).toBeGreaterThanOrEqual(0);
  });

  test("10. Trade-offs inclusion", () => {
    const req = buildRecommendationRequest("Samsung phone with 256GB storage");
    const res = buildExplainableRecommendation(req, [candidateSamsung, candidateSamsungRunnerUp]);

    expect(Array.isArray(res.tradeOffs)).toBe(true);
  });

  test("11. No eligible candidates (safe low confidence & empty fields)", () => {
    const req = buildRecommendationRequest("only Samsung");
    const res = buildExplainableRecommendation(req, [candidateAppleIneligible]);

    expect(res.recommendedCandidate).toBeNull();
    expect(res.recommendationScore).toBe(0);
    expect(res.confidence).toBe("low");
    expect(res.reasons).toEqual([]);
    expect(res.tradeOffs).toEqual([]);
    expect(res.alternatives).toEqual([]);
    expect(res.metadata.evaluatedCandidateCount).toBe(1);
  });

  test("12. Immutability (candidate & request objects unmutated)", () => {
    const req = buildRecommendationRequest("Samsung phone");
    const reqCopy = JSON.parse(JSON.stringify(req));
    const candCopy = JSON.parse(JSON.stringify(candidateSamsung));

    buildExplainableRecommendation(req, [candidateSamsung]);

    expect(req).toEqual(reqCopy);
    expect(candidateSamsung).toEqual(candCopy);
  });

  test("13. Deterministic output apart from metadata timestamp", () => {
    const req = buildRecommendationRequest("Samsung phone");
    const res1 = buildExplainableRecommendation(req, [candidateSamsung, candidateSamsungRunnerUp]);
    const res2 = buildExplainableRecommendation(req, [candidateSamsung, candidateSamsungRunnerUp]);

    expect(res1.recommendedCandidate).toBe(res2.recommendedCandidate);
    expect(res1.recommendationScore).toBe(res2.recommendationScore);
    expect(res1.confidence).toBe(res2.confidence);
    expect(res1.reasons).toEqual(res2.reasons);
    expect(res1.alternatives).toEqual(res2.alternatives);
  });

  test("14. Complete End-to-End Decision Flow: query -> Request -> evaluate -> select -> explain", () => {
    const rawQuery = "Samsung phone under ₹50,000 with 256GB storage, preferably AMOLED";
    const request = buildRecommendationRequest(rawQuery);
    const result = buildExplainableRecommendation(request, [candidateSamsung, candidateSamsungRunnerUp, candidateAppleIneligible]);

    expect(result.recommendedCandidate).toBe(candidateSamsung);
    expect(result.recommendationScore).toBeGreaterThan(50);
    expect(result.confidence).toBe("high");
    expect(result.reasons.length).toBeGreaterThan(0);
    expect(result.metadata.decisionAlgorithmVersion).toBe("1.12.3");
  });
});
