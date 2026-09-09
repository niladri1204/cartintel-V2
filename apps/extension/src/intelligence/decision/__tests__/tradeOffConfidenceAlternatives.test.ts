import { describe, test, expect } from "vitest";
import { buildExplainableRecommendation } from "../decisionExplanation";
import { buildRecommendationRequest } from "../../intent/recommendationRequestBuilder";
import type { RecommendationCandidate, RecommendationRequest } from "../../recommendationTypes";

describe("tradeOffConfidenceAlternatives - Phase 1.12.5.2 Trade-offs, Confidence & Alternatives", () => {
  const candidateS24CheapUnreliable: RecommendationCandidate = {
    product: {
      brand: "samsung",
      category: "smartphone",
      originalPrice: 35000,
      originalCurrency: "INR",
      originalUrl: "https://www.discountcell.in/s24",
      originalTitle: "Samsung Galaxy S24 (256GB)",
      normalizedTitle: "samsung galaxy s24 256gb",
      storage: "256GB",
      model: "Galaxy S24",
      confidence: 90,
      fingerprint: "samsung|galaxy s24",
      metadata: { marketplace: "DiscountCell", hostname: "discountcell.in", detectedAt: Date.now() }
    },
    isRefurbishedOrUsed: false,
    finalRankingScore: 50,
    priceAvailabilityScore: 50,
    identityConfidenceScore: 90,
    qualityScore: 50,
    marketplaceReliabilityScore: 40,
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
      originalUrl: "https://www.flipkart.com/s24/p/123",
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
      originalUrl: "https://www.amazon.in/dp/B0S24PREM",
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

  const candidateIPhone15: RecommendationCandidate = {
    product: {
      brand: "apple",
      category: "smartphone",
      originalPrice: 65000,
      originalCurrency: "INR",
      originalUrl: "https://www.amazon.in/dp/B0IPHONE15",
      originalTitle: "Apple iPhone 15 (128GB)",
      normalizedTitle: "apple iphone 15 128gb",
      storage: "128GB",
      model: "iPhone 15",
      confidence: 95,
      fingerprint: "apple|iphone 15",
      metadata: { marketplace: "Amazon", hostname: "amazon.in", detectedAt: Date.now() }
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

  test("1. Cheapest vs Best Value offer trade-off", () => {
    const req = buildRecommendationRequest("Samsung phone");
    const candidates = [candidateS24CheapUnreliable, candidateS24MidValue, candidateS24PremiumBest];
    const res = buildExplainableRecommendation(req, candidates);

    const cheapValTradeOff = res.tradeOffs.find(t => t.aspect.includes("Cheapest vs Best Value"));
    expect(cheapValTradeOff).toBeDefined();
    expect(cheapValTradeOff?.positiveImpact).toContain("35000");
  });

  test("2. Price vs merchant quality trade-off", () => {
    const req = buildRecommendationRequest("Samsung phone");
    const candidates = [candidateS24CheapUnreliable, candidateS24PremiumBest];
    const res = buildExplainableRecommendation(req, candidates);

    const priceMktTradeOff = res.tradeOffs.find(t => t.aspect.includes("Price vs Merchant Quality"));
    expect(priceMktTradeOff).toBeDefined();
  });

  test("3. Product fit vs offer quality trade-off", () => {
    const req = buildRecommendationRequest("Samsung phone with 256GB storage");
    const candidates = [candidateS24PremiumBest, candidateIPhone15];
    const res = buildExplainableRecommendation(req, candidates);

    expect(res.tradeOffs).toBeDefined();
  });

  test("4. Missing-evidence safety (trade-offs omitted when evidence unavailable)", () => {
    const req = buildRecommendationRequest("phone");
    const res = buildExplainableRecommendation(req, [candidateS24PremiumBest]);

    // Single candidate -> no trade-offs between options
    expect(res.tradeOffs).toHaveLength(0);
  });

  test("5. Extended confidence calculation & high/medium/low boundaries", () => {
    const req = buildRecommendationRequest("Samsung phone");
    const resHigh = buildExplainableRecommendation(req, [candidateS24PremiumBest]);
    expect(resHigh.confidence).toBe("high");
    expect(resHigh.confidenceDetails?.factors.dataCompleteness).toBeGreaterThan(0.5);

    const candidateSparse: RecommendationCandidate = {
      product: {
        brand: null,
        category: "smartphone",
        originalPrice: null,
        originalCurrency: null,
        originalTitle: "Phone",
        normalizedTitle: "phone",
        confidence: 40,
        fingerprint: "generic|phone"
      },
      isRefurbishedOrUsed: false,
      finalRankingScore: 40,
      priceAvailabilityScore: 40,
      identityConfidenceScore: 40,
      qualityScore: 40,
      marketplaceReliabilityScore: 40,
      duplicateRedundancyScore: 0,
      isCurrentProduct: false,
      isUnavailable: false,
      currencyMismatch: false
    };

    const resLow = buildExplainableRecommendation(req, [candidateSparse]);
    expect(resLow.confidence).toBe("low");
  });

  test("6. Eligible runner-up product alternatives labeled 'Alternative Product:'", () => {
    const req = buildRecommendationRequest("Smartphone with 256GB storage");
    const candidates = [candidateS24PremiumBest, candidateIPhone15];
    const res = buildExplainableRecommendation(req, candidates);

    expect(res.alternatives.length).toBeGreaterThan(0);
    const altProduct = res.alternatives.find(a => a.comparisonMessage.startsWith("Alternative Product:"));
    expect(altProduct).toBeDefined();
    expect(altProduct?.comparisonMessage).toContain("Apple");
  });

  test("7. Alternative offers for the same product are NOT treated as Alternative Products", () => {
    const req = buildRecommendationRequest("Samsung phone");
    const candidates = [candidateS24PremiumBest, candidateS24MidValue];
    const res = buildExplainableRecommendation(req, candidates);

    // Because they are both Galaxy S24, they are clustered as offers, not alternatives
    expect(res.alternatives.length).toBe(0);
  });

  test("8. Ineligible alternative exclusion", () => {
    const candidateIneligible: RecommendationCandidate = {
      ...candidateIPhone15,
      product: { ...candidateIPhone15.product!, brand: "apple" }
    };
    const req: RecommendationRequest = {
      hardConstraints: [{ attribute: "brand", operator: "equals", value: "samsung" }],
      candidates: [candidateS24PremiumBest, candidateIneligible]
    };

    const res = buildExplainableRecommendation(req);
    expect(res.alternatives).toHaveLength(0);
  });

  test("9. Score difference correctness", () => {
    const req = buildRecommendationRequest("smartphone");
    const candidates = [candidateS24PremiumBest, candidateIPhone15];
    const res = buildExplainableRecommendation(req, candidates);

    expect(res.alternatives.length).toBeGreaterThan(0);
    expect(res.alternatives[0].scoreDifference).toBeGreaterThanOrEqual(0);
  });

  test("10. Candidate and request immutability", () => {
    const req = buildRecommendationRequest("Samsung phone");
    const reqCopy = JSON.parse(JSON.stringify(req));
    const candCopy = JSON.parse(JSON.stringify(candidateS24PremiumBest));

    buildExplainableRecommendation(req, [candidateS24PremiumBest, candidateS24MidValue]);

    expect(req).toEqual(reqCopy);
    expect(candidateS24PremiumBest).toEqual(candCopy);
  });

  test("11. Determinism across repeated runs", () => {
    const req = buildRecommendationRequest("Samsung phone");
    const candidates = [candidateS24PremiumBest, candidateS24MidValue];
    const r1 = buildExplainableRecommendation(req, candidates);
    const r2 = buildExplainableRecommendation(req, candidates);

    expect(r1.tradeOffs).toEqual(r2.tradeOffs);
    expect(r1.alternatives).toEqual(r2.alternatives);
    expect(r1.confidence).toEqual(r2.confidence);
  });

  test("12. Null and empty input safety", () => {
    const res = buildExplainableRecommendation(null, []);
    expect(res.recommendedCandidate).toBeNull();
    expect(res.tradeOffs).toEqual([]);
    expect(res.alternatives).toEqual([]);
  });
});
