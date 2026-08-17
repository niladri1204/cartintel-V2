import { describe, test, expect } from "vitest";
import { identifyAlternativeProducts } from "../alternativeProduct";
import { buildRecommendationRequest } from "../../intent/recommendationRequestBuilder";
import type { RecommendationCandidate, RecommendationRequest } from "../../recommendationTypes";

describe("alternativeProduct - Phase 1.12.6.1 Alternative Product Identification", () => {
  const candidateS24Amazon: RecommendationCandidate = {
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
    isCurrentProduct: false,
    variantState: "explicitly_matching",
    isRefurbishedOrUsed: false,
    isUnavailable: false,
    savingsValue: null,
    savingsPercentage: null,
    currencyMismatch: false,
    finalRankingScore: 90,
    priceAvailabilityScore: 90,
    identityConfidenceScore: 90,
    qualityScore: 90,
    marketplaceReliabilityScore: 90,
    duplicateRedundancyScore: 0
  };

  const candidateS24Flipkart: RecommendationCandidate = {
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
    isCurrentProduct: false,
    variantState: "explicitly_matching",
    isRefurbishedOrUsed: false,
    isUnavailable: false,
    savingsValue: null,
    savingsPercentage: null,
    currencyMismatch: false,
    finalRankingScore: 95,
    priceAvailabilityScore: 95,
    identityConfidenceScore: 95,
    qualityScore: 95,
    marketplaceReliabilityScore: 95,
    duplicateRedundancyScore: 0
  };

  const candidateA55Amazon: RecommendationCandidate = {
    product: {
      brand: "samsung",
      category: "smartphone",
      originalPrice: 32000,
      originalCurrency: "INR",
      originalTitle: "Samsung Galaxy A55 (128GB)",
      normalizedTitle: "samsung galaxy a55 128gb",
      storage: "128GB",
      model: "Galaxy A55",
      confidence: 85,
      fingerprint: "samsung|galaxy a55",
      metadata: { marketplace: "Amazon", hostname: "amazon.in", detectedAt: Date.now() }
    },
    isCurrentProduct: false,
    variantState: "explicitly_matching",
    isRefurbishedOrUsed: false,
    isUnavailable: false,
    savingsValue: null,
    savingsPercentage: null,
    currencyMismatch: false,
    finalRankingScore: 85,
    priceAvailabilityScore: 85,
    identityConfidenceScore: 85,
    qualityScore: 85,
    marketplaceReliabilityScore: 85,
    duplicateRedundancyScore: 0
  };

  const candidateIPhone15: RecommendationCandidate = {
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
    isCurrentProduct: false,
    variantState: "explicitly_matching",
    isRefurbishedOrUsed: false,
    isUnavailable: false,
    savingsValue: null,
    savingsPercentage: null,
    currencyMismatch: false,
    finalRankingScore: 95,
    priceAvailabilityScore: 95,
    identityConfidenceScore: 95,
    qualityScore: 95,
    marketplaceReliabilityScore: 95,
    duplicateRedundancyScore: 0
  };

  const candidateSonyTv: RecommendationCandidate = {
    product: {
      brand: "sony",
      category: "television",
      originalPrice: 75000,
      originalCurrency: "INR",
      originalTitle: "Sony Bravia 55 Inch 4K TV",
      normalizedTitle: "sony bravia 55 inch 4k tv",
      model: "Bravia 55",
      confidence: 90,
      fingerprint: "sony|bravia 55",
      metadata: { marketplace: "Amazon", hostname: "amazon.in", detectedAt: Date.now() }
    },
    isCurrentProduct: false,
    variantState: "explicitly_matching",
    isRefurbishedOrUsed: false,
    isUnavailable: false,
    savingsValue: null,
    savingsPercentage: null,
    currencyMismatch: false,
    finalRankingScore: 80,
    priceAvailabilityScore: 80,
    identityConfidenceScore: 90,
    qualityScore: 80,
    marketplaceReliabilityScore: 90,
    duplicateRedundancyScore: 0
  };

  test("1. Exact recommended product exclusion by fingerprint", () => {
    const req = buildRecommendationRequest("Samsung phone");
    req.candidates = [candidateS24Amazon, candidateA55Amazon];

    const result = identifyAlternativeProducts(req);
    expect(result.recommendedProduct).toBeDefined();
    expect(result.recommendedProduct?.fingerprint).toBe("samsung|galaxy s24");

    const altFingerprints = result.alternatives.map(a => a.fingerprint);
    expect(altFingerprints).not.toContain("samsung|galaxy s24");
    expect(altFingerprints).toContain("samsung|galaxy a55");
  });

  test("2. Same-product multi-offer exclusion (offers of winning product belong to same group)", () => {
    const req = buildRecommendationRequest("Samsung phone");
    req.candidates = [candidateS24Amazon, candidateS24Flipkart, candidateA55Amazon];

    const result = identifyAlternativeProducts(req);
    // 3 offers grouped into 2 canonical products (S24 vs A55)
    expect(result.evaluatedProductCount).toBe(2);
    expect(result.alternatives).toHaveLength(1);
    expect(result.alternatives[0].fingerprint).toBe("samsung|galaxy a55");
  });

  test("3. Alternative canonical product detection", () => {
    const req = buildRecommendationRequest("Samsung phone");
    req.explicitRequirements = [{ attribute: "brand", operator: "equals", value: "samsung" }];
    req.candidates = [candidateS24Amazon, candidateIPhone15];

    const result = identifyAlternativeProducts(req);
    expect(result.recommendedProduct).toBeDefined();
    expect(result.recommendedProduct?.fingerprint).toBe("samsung|galaxy s24");
    expect(result.alternatives.length).toBe(1);
    expect(result.alternatives[0].product.brand).toBe("apple");
  });

  test("4. Same-category preference (smartphone vs television)", () => {
    const req = buildRecommendationRequest("Smartphone");
    req.candidates = [candidateS24Amazon, candidateA55Amazon, candidateSonyTv];

    const result = identifyAlternativeProducts(req);
    expect(result.alternatives.length).toBe(2);
    // Smartphone candidate (A55) must outrank television candidate (Sony TV)
    expect(result.alternatives[0].fingerprint).toBe("samsung|galaxy a55");
    expect(result.alternatives[1].fingerprint).toBe("sony|bravia 55");
  });

  test("5. Hard-constraint filtering (ineligible products receive score 0 & NEVER appear as alternatives)", () => {
    const req: RecommendationRequest = {
      hardConstraints: [{ attribute: "brand", operator: "equals", value: "samsung" }],
      candidates: [candidateS24Amazon, candidateIPhone15]
    };

    const result = identifyAlternativeProducts(req);
    expect(result.recommendedProduct?.fingerprint).toBe("samsung|galaxy s24");
    // iPhone violates brand constraint, so it receives ineligible and must NOT be returned
    expect(result.alternatives).toHaveLength(0);
  });

  test("6. Explicit requirement compatibility influencing similarityScore", () => {
    const req = buildRecommendationRequest("Smartphone with 128GB storage");
    req.candidates = [candidateS24Amazon, candidateA55Amazon, candidateIPhone15];

    const result = identifyAlternativeProducts(req);
    const a55Alt = result.alternatives.find(a => a.fingerprint === "samsung|galaxy a55");
    expect(a55Alt?.requirementFitScore).toBe(100); // 128GB storage matched
  });

  test("7. Preference fit calculation", () => {
    const req = buildRecommendationRequest("Prefer Samsung phone");
    req.candidates = [candidateS24Amazon, candidateA55Amazon, candidateIPhone15];

    const result = identifyAlternativeProducts(req);
    const a55Alt = result.alternatives.find(a => a.fingerprint === "samsung|galaxy a55");
    const appleAlt = result.alternatives.find(a => a.fingerprint === "apple|iphone 15");

    expect(a55Alt?.preferenceFitScore).toBeGreaterThan(appleAlt?.preferenceFitScore || 0);
  });

  test("8. Product identity confidence extraction", () => {
    const req = buildRecommendationRequest("Samsung phone");
    req.candidates = [candidateS24Amazon, candidateA55Amazon];

    const result = identifyAlternativeProducts(req);
    expect(result.alternatives[0].identityConfidence).toBe(85);
  });

  test("9. Storage variant handling (same fingerprint forms single product decision group)", () => {
    const candidateS24_512GB: RecommendationCandidate = {
      ...candidateS24Amazon,
      product: {
        ...candidateS24Amazon.product!,
        storage: "512GB",
        originalTitle: "Samsung Galaxy S24 (512GB)"
      }
    };
    const req = buildRecommendationRequest("Samsung phone");
    req.candidates = [candidateS24Amazon, candidateS24_512GB, candidateA55Amazon];

    const result = identifyAlternativeProducts(req);
    // S24 256GB and S24 512GB share "samsung|galaxy s24" fingerprint, so grouped together
    expect(result.evaluatedProductCount).toBe(2);
    expect(result.alternatives).toHaveLength(1);
    expect(result.alternatives[0].fingerprint).toBe("samsung|galaxy a55");
  });

  test("10. Missing-data safety", () => {
    const candidateSparse: RecommendationCandidate = {
      product: {
        brand: null,
        category: "smartphone",
        originalPrice: 20000,
        originalCurrency: "INR",
        originalTitle: "Generic Phone",
        normalizedTitle: "generic phone",
        confidence: 50,
        fingerprint: "generic|phone"
      },
      isCurrentProduct: false,
      variantState: "explicitly_matching",
      isRefurbishedOrUsed: false,
      isUnavailable: false,
      savingsValue: null,
      savingsPercentage: null,
      currencyMismatch: false,
      finalRankingScore: 50,
      priceAvailabilityScore: 50,
      identityConfidenceScore: 50,
      qualityScore: 50,
      marketplaceReliabilityScore: 50,
      duplicateRedundancyScore: 0
    };

    const req = buildRecommendationRequest("Smartphone");
    req.candidates = [candidateS24Amazon, candidateSparse];

    const result = identifyAlternativeProducts(req);
    expect(result.alternatives).toHaveLength(1);
    expect(result.alternatives[0].fingerprint).toBe("generic|phone");
  });

  test("11. Deterministic ordering with fingerprint tie-breaker", () => {
    const candA: RecommendationCandidate = {
      ...candidateA55Amazon,
      product: { ...candidateA55Amazon.product!, fingerprint: "brand|prod-a" }
    };
    const candB: RecommendationCandidate = {
      ...candidateA55Amazon,
      product: { ...candidateA55Amazon.product!, fingerprint: "brand|prod-b" }
    };

    const req = buildRecommendationRequest("Smartphone");
    req.candidates = [candidateS24Amazon, candB, candA];

    const res1 = identifyAlternativeProducts(req);
    const res2 = identifyAlternativeProducts(req);

    expect(res1.alternatives).toEqual(res2.alternatives);
    expect(res1.alternatives[0].fingerprint).toBe("brand|prod-a");
    expect(res1.alternatives[1].fingerprint).toBe("brand|prod-b");
  });

  test("12. Reason generation format", () => {
    const req = buildRecommendationRequest("Samsung phone");
    req.candidates = [candidateS24Amazon, candidateA55Amazon];

    const result = identifyAlternativeProducts(req);
    const reason = result.alternatives[0].reason;

    expect(reason).toContain("Alternative SAMSUNG product");
    expect(reason).toContain("Galaxy A55");
    expect(reason).toContain("identity confidence");
  });

  test("13. Null/empty input safety", () => {
    const res1 = identifyAlternativeProducts(null, []);
    expect(res1.recommendedProduct).toBeNull();
    expect(res1.alternatives).toEqual([]);

    const res2 = identifyAlternativeProducts(undefined);
    expect(res2.recommendedProduct).toBeNull();
    expect(res2.alternatives).toEqual([]);
  });

  test("14. Immutability of request and candidates", () => {
    const req = buildRecommendationRequest("Samsung phone");
    req.candidates = [candidateS24Amazon, candidateA55Amazon];

    const reqCopy = JSON.parse(JSON.stringify(req));
    const candCopy = JSON.parse(JSON.stringify(candidateS24Amazon));

    identifyAlternativeProducts(req);

    expect(req).toEqual(reqCopy);
    expect(candidateS24Amazon).toEqual(candCopy);
  });
});
