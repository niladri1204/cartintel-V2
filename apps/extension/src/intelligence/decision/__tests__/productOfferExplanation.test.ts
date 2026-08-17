import { describe, test, expect } from "vitest";
import { buildExplainableRecommendation } from "../decisionExplanation";
import { buildRecommendationRequest } from "../../intent/recommendationRequestBuilder";
import type { RecommendationCandidate, RecommendationRequest } from "../../recommendationTypes";

describe("productOfferExplanation - Phase 1.12.5.1 Product & Offer Explanation", () => {
  const candidateS24Cheap: RecommendationCandidate = {
    product: {
      brand: "samsung",
      category: "smartphone",
      originalPrice: 35000,
      originalCurrency: "INR",
      originalTitle: "Samsung Galaxy S24 (256GB)",
      normalizedTitle: "samsung galaxy s24 256gb",
      storage: "256GB",
      model: "Galaxy S24",
      confidence: 90,
      fingerprint: "samsung|galaxy s24",
      metadata: { marketplace: "DiscountCell", hostname: "discountcell.in", detectedAt: Date.now() }
    },
    isRefurbishedOrUsed: false,
    finalRankingScore: 60,
    priceAvailabilityScore: 60,
    identityConfidenceScore: 90,
    qualityScore: 60,
    marketplaceReliabilityScore: 50,
    duplicateRedundancyScore: 0,
    isCurrentProduct: false,
    isUnavailable: false,
    currencyMismatch: false
  };

  const candidateS24MidValue: RecommendationCandidate = {
    product: {
      brand: "samsung",
      category: "smartphone",
      originalPrice: 40000,
      originalCurrency: "INR",
      originalTitle: "Samsung Galaxy S24 (256GB, Black)",
      normalizedTitle: "samsung galaxy s24 256gb black",
      storage: "256GB",
      model: "Galaxy S24",
      confidence: 95,
      fingerprint: "samsung|galaxy s24",
      metadata: { marketplace: "Flipkart", hostname: "flipkart.com", detectedAt: Date.now() }
    },
    isRefurbishedOrUsed: false,
    finalRankingScore: 95,
    priceAvailabilityScore: 90,
    identityConfidenceScore: 95,
    qualityScore: 95,
    marketplaceReliabilityScore: 95,
    duplicateRedundancyScore: 0,
    isCurrentProduct: false,
    isUnavailable: false,
    currencyMismatch: false
  };

  const candidateS24PremiumBest: RecommendationCandidate = {
    product: {
      brand: "samsung",
      category: "smartphone",
      originalPrice: 42000,
      originalCurrency: "INR",
      originalTitle: "Samsung Galaxy S24 (256GB, Official Warranty)",
      normalizedTitle: "samsung galaxy s24 256gb official warranty",
      storage: "256GB",
      model: "Galaxy S24",
      confidence: 98,
      fingerprint: "samsung|galaxy s24",
      metadata: { marketplace: "Amazon", hostname: "amazon.in", detectedAt: Date.now() }
    },
    isRefurbishedOrUsed: false,
    finalRankingScore: 100,
    priceAvailabilityScore: 100,
    identityConfidenceScore: 98,
    qualityScore: 100,
    marketplaceReliabilityScore: 100,
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
      originalTitle: "Apple iPhone 15",
      normalizedTitle: "apple iphone 15",
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

  test("1. Product requirement explanation generated under productReasons", () => {
    const req = buildRecommendationRequest("Samsung phone with 256GB storage");
    const res = buildExplainableRecommendation(req, [candidateS24PremiumBest]);

    expect(res.productOfferDetails?.productReasons).toBeDefined();
    const reqReason = res.productOfferDetails?.productReasons.find(r => r.message.includes("explicit requirements") || r.message.includes("specifications"));
    expect(reqReason).toBeDefined();
    expect(reqReason?.message).toContain("storage: 256GB");
  });

  test("2. Product preference explanation generated under productReasons", () => {
    const req = buildRecommendationRequest("Prefer Samsung phone");
    const res = buildExplainableRecommendation(req, [candidateS24PremiumBest]);

    const prefReason = res.productOfferDetails?.productReasons.find(r => r.type === "preference_match");
    expect(prefReason).toBeDefined();
    expect(prefReason?.message).toContain("brand_loyalty: samsung");
  });

  test("3. Product identity-confidence explanation generated under productReasons", () => {
    const req = buildRecommendationRequest("Samsung phone");
    const res = buildExplainableRecommendation(req, [candidateS24PremiumBest]);

    const identReason = res.productOfferDetails?.productReasons.find(r => r.message.includes("identity certainty"));
    expect(identReason).toBeDefined();
    expect(identReason?.message).toContain("samsung");
  });

  test("4. Best-offer explanation generated under offerReasons & bestOfferSummary", () => {
    const req = buildRecommendationRequest("Samsung phone");
    const res = buildExplainableRecommendation(req, [candidateS24PremiumBest]);

    expect(res.productOfferDetails?.bestOfferSummary).toContain("Amazon");
    expect(res.productOfferDetails?.bestOfferSummary).toContain("42000");

    const mktReason = res.productOfferDetails?.offerReasons.find(r => r.type === "reputation");
    expect(mktReason).toBeDefined();
  });

  test("5. Cheapest-offer explanation included in cheapestOfferSummary", () => {
    const req = buildRecommendationRequest("Samsung phone");
    const res = buildExplainableRecommendation(req, [candidateS24Cheap, candidateS24PremiumBest]);

    expect(res.productOfferDetails?.cheapestOfferSummary).toContain("DiscountCell");
    expect(res.productOfferDetails?.cheapestOfferSummary).toContain("35000");
  });

  test("6. Best-value-offer explanation included in bestValueOfferSummary", () => {
    const req = buildRecommendationRequest("Samsung phone");
    const res = buildExplainableRecommendation(req, [candidateS24Cheap, candidateS24MidValue, candidateS24PremiumBest]);

    expect(res.productOfferDetails?.bestValueOfferSummary).toContain("Flipkart");
    expect(res.productOfferDetails?.bestValueOfferSummary).toContain("40000");
  });

  test("7. Product vs offer explanation separation (productReasons has 0 seller price dependency)", () => {
    const expensiveS24: RecommendationCandidate = {
      ...candidateS24PremiumBest,
      product: { ...candidateS24PremiumBest.product!, originalPrice: 150000 }
    };
    const req = buildRecommendationRequest("Samsung phone with 256GB storage");

    const res1 = buildExplainableRecommendation(req, [candidateS24PremiumBest]);
    const res2 = buildExplainableRecommendation(req, [expensiveS24]);

    // Product reasons must be identical regardless of seller price!
    expect(res1.productOfferDetails?.productReasons).toEqual(res2.productOfferDetails?.productReasons);
    // Offer reasons differ because of seller price difference
    expect(res1.productOfferDetails?.offerReasons).not.toEqual(res2.productOfferDetails?.offerReasons);
  });

  test("8. Missing evidence safety (reasons omitted when evidence unavailable)", () => {
    const req = buildRecommendationRequest("phone");
    const res = buildExplainableRecommendation(req, [candidateS24Cheap]);

    const prefReason = res.productOfferDetails?.productReasons.find(r => r.type === "preference_match");
    expect(prefReason).toBeUndefined();
  });

  test("9. Hard-constraint safety (ineligible candidates never praised or recommended)", () => {
    const req: RecommendationRequest = {
      hardConstraints: [{ attribute: "brand", operator: "equals", value: "samsung" }],
      candidates: []
    };
    const res = buildExplainableRecommendation(req, [candidateAppleIneligible]);

    expect(res.recommendedCandidate).toBeNull();
    expect(res.productOfferDetails).toBeUndefined();
    expect(res.reasons).toEqual([]);
  });

  test("10. Multi-offer explanation formatting", () => {
    const req = buildRecommendationRequest("Samsung phone");
    const res = buildExplainableRecommendation(req, [candidateS24Cheap, candidateS24MidValue, candidateS24PremiumBest]);

    expect(res.productOfferDetails?.bestProductSummary).toBeDefined();
    expect(res.productOfferDetails?.bestOfferSummary).toBeDefined();
    expect(res.productOfferDetails?.cheapestOfferSummary).toBeDefined();
    expect(res.productOfferDetails?.bestValueOfferSummary).toBeDefined();
  });

  test("11. Immutability (candidate & request objects unmutated)", () => {
    const req = buildRecommendationRequest("Samsung phone");
    const reqCopy = JSON.parse(JSON.stringify(req));
    const candCopy = JSON.parse(JSON.stringify(candidateS24PremiumBest));

    buildExplainableRecommendation(req, [candidateS24PremiumBest]);

    expect(req).toEqual(reqCopy);
    expect(candidateS24PremiumBest).toEqual(candCopy);
  });

  test("12. Determinism across repeated executions", () => {
    const req = buildRecommendationRequest("Samsung phone");
    const res1 = buildExplainableRecommendation(req, [candidateS24PremiumBest]);
    const res2 = buildExplainableRecommendation(req, [candidateS24PremiumBest]);

    expect(res1.productOfferDetails).toEqual(res2.productOfferDetails);
  });

  test("13. Null/empty input safety", () => {
    const res1 = buildExplainableRecommendation(null, []);
    expect(res1.recommendedCandidate).toBeNull();
    expect(res1.productOfferDetails).toBeUndefined();

    const res2 = buildExplainableRecommendation(undefined);
    expect(res2.recommendedCandidate).toBeNull();
  });

  test("14. Backward compatibility with existing RecommendationResult contract", () => {
    const req = buildRecommendationRequest("Samsung phone");
    const res = buildExplainableRecommendation(req, [candidateS24PremiumBest]);

    // All original RecommendationResult fields must be present and valid
    expect(res.recommendedCandidate).toBeDefined();
    expect(typeof res.recommendationScore).toBe("number");
    expect(res.confidence).toBe("high");
    expect(res.confidenceDetails).toBeDefined();
    expect(Array.isArray(res.reasons)).toBe(true);
    expect(Array.isArray(res.tradeOffs)).toBe(true);
    expect(Array.isArray(res.alternatives)).toBe(true);
    expect(res.metadata.decisionAlgorithmVersion).toBe("1.12.3");
  });
});
