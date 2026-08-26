import { describe, test, expect } from "vitest";
import { evaluateProductLevelDecisions } from "../productDecision";
import type { RecommendationRequest, RecommendationCandidate } from "../../recommendationTypes";

describe("productDecision - Phase 1.12.4.1 Product-Level Decision", () => {
  const offerSamsungAmazon: RecommendationCandidate = {
    product: {
      brand: "samsung",
      category: "smartphone",
      originalPrice: 45000,
      originalCurrency: "INR",
      originalTitle: "Samsung Galaxy S24 (256GB)",
      normalizedTitle: "samsung galaxy s24 256gb",
      storage: "256GB",
      model: "Galaxy S24",
      confidence: 90,
      fingerprint: "samsung|galaxy s24",
      metadata: { marketplace: "Amazon", hostname: "amazon.in", detectedAt: Date.now() }
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

  const offerSamsungFlipkart: RecommendationCandidate = {
    product: {
      brand: "samsung",
      category: "smartphone",
      originalPrice: 42000,
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
    priceAvailabilityScore: 95,
    identityConfidenceScore: 95,
    qualityScore: 95,
    marketplaceReliabilityScore: 95,
    duplicateRedundancyScore: 0,
    isCurrentProduct: false,
    isUnavailable: false,
    currencyMismatch: false
  };

  const offerAppleAmazon: RecommendationCandidate = {
    product: {
      brand: "apple",
      category: "smartphone",
      originalPrice: 65000,
      originalCurrency: "INR",
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

  test("1. Product grouping (same fingerprint grouped together)", () => {
    const res = evaluateProductLevelDecisions(null, [offerSamsungAmazon, offerSamsungFlipkart, offerAppleAmazon]);
    expect(res.evaluatedProductCount).toBe(2);
    expect(res.productGroups).toHaveLength(2);

    const samsungGroup = res.productGroups.find(g => g.fingerprint === "samsung|galaxy s24");
    expect(samsungGroup).toBeDefined();
    expect(samsungGroup?.offers).toHaveLength(2);
  });

  test("2. Multi-offer aggregation (lowestPrice, highestPrice, averagePrice, marketplaces, bestIdentityConfidence)", () => {
    const res = evaluateProductLevelDecisions(null, [offerSamsungAmazon, offerSamsungFlipkart]);
    const group = res.productGroups[0];

    expect(group.lowestPrice).toBe(42000);
    expect(group.highestPrice).toBe(45000);
    expect(group.averagePrice).toBe(43500);
    expect(group.currency).toBe("INR");
    expect(group.marketplaces).toContain("Amazon");
    expect(group.marketplaces).toContain("Flipkart");
    expect(group.bestIdentityConfidence).toBe(95);
  });

  test("3. Requirement fit score calculation", () => {
    const req: RecommendationRequest = {
      explicitRequirements: [
        { attribute: "storage", value: "256GB", operator: "equals", isMandatory: true }
      ],
      candidates: [offerSamsungAmazon, offerAppleAmazon]
    };

    const res = evaluateProductLevelDecisions(req);
    const samsungGroup = res.productGroups.find(g => g.fingerprint === "samsung|galaxy s24");
    const appleGroup = res.productGroups.find(g => g.fingerprint === "apple|iphone 15");

    expect(samsungGroup?.requirementFitScore).toBe(100);
    expect(appleGroup?.requirementFitScore).toBe(0);
  });

  test("4. Preference fit score calculation", () => {
    const req: RecommendationRequest = {
      userPreferences: [
        { key: "brand_loyalty", value: "samsung" }
      ],
      candidates: [offerSamsungAmazon, offerAppleAmazon]
    };

    const res = evaluateProductLevelDecisions(req);
    const samsungGroup = res.productGroups.find(g => g.fingerprint === "samsung|galaxy s24");
    const appleGroup = res.productGroups.find(g => g.fingerprint === "apple|iphone 15");

    expect(samsungGroup?.preferenceFitScore).toBe(100);
    expect(appleGroup?.preferenceFitScore).toBe(0);
  });

  test("5. Product fit score calculation formula (0.50 * req + 0.30 * pref + 0.20 * confidence)", () => {
    const req: RecommendationRequest = {
      explicitRequirements: [{ attribute: "storage", value: "256GB", operator: "equals", isMandatory: true }],
      userPreferences: [{ key: "brand_loyalty", value: "samsung" }],
      candidates: [offerSamsungAmazon]
    };

    const res = evaluateProductLevelDecisions(req);
    const g = res.productGroups[0];
    // 0.50 * 100 + 0.30 * 100 + 0.20 * 90 = 50 + 30 + 18 = 98
    expect(g.productFitScore).toBe(98);
  });

  test("6. Separation of product fit from seller price", () => {
    const expensiveSamsung: RecommendationCandidate = {
      ...offerSamsungAmazon,
      product: {
        ...offerSamsungAmazon.product!,
        originalPrice: 150000 // seller price changed drastically
      }
    };

    const res1 = evaluateProductLevelDecisions({
      explicitRequirements: [{ attribute: "storage", value: "256GB", operator: "equals", isMandatory: true }]
    }, [offerSamsungAmazon]);

    const res2 = evaluateProductLevelDecisions({
      explicitRequirements: [{ attribute: "storage", value: "256GB", operator: "equals", isMandatory: true }]
    }, [expensiveSamsung]);

    expect(res1.productGroups[0].productFitScore).toBe(res2.productGroups[0].productFitScore);
  });

  test("7. Hard constraint eligibility (product is eligible if at least 1 offer is eligible)", () => {
    const req: RecommendationRequest = {
      hardConstraints: [{ attribute: "brand", operator: "equals", value: "samsung" }],
      candidates: [offerSamsungAmazon, offerAppleAmazon]
    };

    const res = evaluateProductLevelDecisions(req);
    const samsungGroup = res.productGroups.find(g => g.fingerprint === "samsung|galaxy s24");
    const appleGroup = res.productGroups.find(g => g.fingerprint === "apple|iphone 15");

    expect(samsungGroup?.isEligible).toBe(true);
    expect(appleGroup?.isEligible).toBe(false);
  });

  test("8. Best product group selection (selected only from eligible products)", () => {
    const req: RecommendationRequest = {
      hardConstraints: [{ attribute: "brand", operator: "equals", value: "samsung" }],
      candidates: [offerAppleAmazon, offerSamsungAmazon]
    };

    const res = evaluateProductLevelDecisions(req);
    expect(res.bestProductGroup?.fingerprint).toBe("samsung|galaxy s24");
    expect(res.productScore).toBeGreaterThan(0);
  });

  test("9. Deterministic tie-breaking (bestIdentityConfidence -> fingerprint string compare)", () => {
    const offerTied1: RecommendationCandidate = {
      ...offerSamsungAmazon,
      identityConfidenceScore: 95,
      product: { ...offerSamsungAmazon.product!, fingerprint: "brand|product_a" }
    };
    const offerTied2: RecommendationCandidate = {
      ...offerSamsungAmazon,
      identityConfidenceScore: 90,
      product: { ...offerSamsungAmazon.product!, fingerprint: "brand|product_b" }
    };

    const res = evaluateProductLevelDecisions(null, [offerTied1, offerTied2]);
    expect(res.bestProductGroup?.fingerprint).toBe("brand|product_a");
  });

  test("10. Missing data handling (missing attributes remain unknown)", () => {
    const candidateSparse: RecommendationCandidate = {
      ...offerSamsungAmazon,
      product: {
        ...offerSamsungAmazon.product!,
        storage: null,
        ram: null,
        originalTitle: "Samsung Phone",
        normalizedTitle: "samsung phone"
      }
    };

    const req: RecommendationRequest = {
      explicitRequirements: [{ attribute: "storage", value: "256GB", operator: "equals", isMandatory: true }]
    };

    const res = evaluateProductLevelDecisions(req, [candidateSparse]);
    expect(res.productGroups[0].requirementFitScore).toBe(0);
  });

  test("11. Mixed currencies handling (price aggregation set to null if currencies incompatible)", () => {
    const offerUSD: RecommendationCandidate = {
      ...offerSamsungAmazon,
      product: {
        ...offerSamsungAmazon.product!,
        originalCurrency: "USD",
        originalPrice: 600
      }
    };

    const res = evaluateProductLevelDecisions(null, [offerSamsungAmazon, offerUSD]);
    const g = res.productGroups[0];
    expect(g.lowestPrice).toBeNull();
    expect(g.highestPrice).toBeNull();
    expect(g.averagePrice).toBeNull();
    expect(g.currency).toBeNull();
  });

  test("12. Immutability (candidate & request objects unmutated)", () => {
    const request = { candidates: [offerSamsungAmazon] };
    const reqCopy = JSON.parse(JSON.stringify(request));
    const offerCopy = JSON.parse(JSON.stringify(offerSamsungAmazon));

    evaluateProductLevelDecisions(request);

    expect(request).toEqual(reqCopy);
    expect(offerSamsungAmazon).toEqual(offerCopy);
  });

  test("13. Null/undefined/empty candidates array safety", () => {
    const res1 = evaluateProductLevelDecisions(null, []);
    expect(res1.bestProductGroup).toBeNull();
    expect(res1.evaluatedProductCount).toBe(0);

    const res2 = evaluateProductLevelDecisions(undefined);
    expect(res2.bestProductGroup).toBeNull();
  });
});
