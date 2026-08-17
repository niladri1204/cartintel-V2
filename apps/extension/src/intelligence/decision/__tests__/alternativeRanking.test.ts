import { describe, test, expect } from "vitest";
import { rankAlternativeProducts } from "../alternativeRanking";
import { buildRecommendationRequest } from "../../intent/recommendationRequestBuilder";
import type { RecommendationCandidate, RecommendationRequest } from "../../recommendationTypes";
import type { AlternativeProduct } from "../decisionTypes";

describe("alternativeRanking - Phase 1.12.6.2 Alternative Ranking & Selection", () => {
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

  const candidatePixel8: RecommendationCandidate = {
    product: {
      brand: "google",
      category: "smartphone",
      originalPrice: 55000,
      originalCurrency: "INR",
      originalTitle: "Google Pixel 8 (128GB)",
      normalizedTitle: "google pixel 8 128gb",
      storage: "128GB",
      model: "Pixel 8",
      confidence: 92,
      fingerprint: "google|pixel 8",
      metadata: { marketplace: "Amazon", hostname: "amazon.in", detectedAt: Date.now() }
    },
    isCurrentProduct: false,
    variantState: "explicitly_matching",
    isRefurbishedOrUsed: false,
    isUnavailable: false,
    savingsValue: null,
    savingsPercentage: null,
    currencyMismatch: false,
    finalRankingScore: 88,
    priceAvailabilityScore: 88,
    identityConfidenceScore: 92,
    qualityScore: 88,
    marketplaceReliabilityScore: 90,
    duplicateRedundancyScore: 0
  };

  const candidateOnePlus12: RecommendationCandidate = {
    product: {
      brand: "oneplus",
      category: "smartphone",
      originalPrice: 60000,
      originalCurrency: "INR",
      originalTitle: "OnePlus 12 (256GB)",
      normalizedTitle: "oneplus 12 256gb",
      storage: "256GB",
      model: "12",
      confidence: 90,
      fingerprint: "oneplus|12",
      metadata: { marketplace: "Amazon", hostname: "amazon.in", detectedAt: Date.now() }
    },
    isCurrentProduct: false,
    variantState: "explicitly_matching",
    isRefurbishedOrUsed: false,
    isUnavailable: false,
    savingsValue: null,
    savingsPercentage: null,
    currencyMismatch: false,
    finalRankingScore: 87,
    priceAvailabilityScore: 87,
    identityConfidenceScore: 90,
    qualityScore: 87,
    marketplaceReliabilityScore: 90,
    duplicateRedundancyScore: 0
  };

  test("1. Correct alternative ranking calculation & sorting", () => {
    const req = buildRecommendationRequest("Samsung phone");
    req.explicitRequirements = [{ attribute: "brand", operator: "equals", value: "samsung" }];
    req.candidates = [candidateS24Amazon, candidateA55Amazon, candidatePixel8];

    const result = rankAlternativeProducts(req);
    expect(result.recommendedProduct?.fingerprint).toBe("samsung|galaxy s24");
    expect(result.alternatives.length).toBeGreaterThan(0);
    expect(result.alternatives[0].rank).toBe(1);
    expect(result.alternatives[0].alternativeScore).toBeGreaterThan(0);
  });

  test("2. Highest-quality alternative selected as selectedAlternative", () => {
    const req = buildRecommendationRequest("Samsung phone");
    req.explicitRequirements = [{ attribute: "brand", operator: "equals", value: "samsung" }];
    req.candidates = [candidateS24Amazon, candidateA55Amazon, candidatePixel8];

    const result = rankAlternativeProducts(req);
    expect(result.selectedAlternative).toBeDefined();
    expect(result.selectedAlternative).toEqual(result.alternatives[0]);
    expect(result.selectedAlternative?.rank).toBe(1);
  });

  test("3. Requirement-fit dominance in alternative ranking", () => {
    const req = buildRecommendationRequest("Smartphone with 128GB storage");
    req.candidates = [candidateS24Amazon, candidateA55Amazon, candidatePixel8];

    const result = rankAlternativeProducts(req);
    // Candidates matching 128GB should score higher requirementFitScore
    expect(result.selectedAlternative?.requirementFitScore).toBe(100);
  });

  test("4. Preference-fit differentiation", () => {
    const altA: AlternativeProduct = {
      product: candidateA55Amazon.product,
      fingerprint: "samsung|galaxy a55",
      similarityScore: 80,
      requirementFitScore: 80,
      preferenceFitScore: 90,
      identityConfidence: 85,
      reason: "Alt A"
    };

    const altB: AlternativeProduct = {
      product: candidatePixel8.product,
      fingerprint: "google|pixel 8",
      similarityScore: 80,
      requirementFitScore: 80,
      preferenceFitScore: 50,
      identityConfidence: 85,
      reason: "Alt B"
    };

    const req = buildRecommendationRequest("Smartphone");
    req.candidates = [candidateS24Amazon];

    const result = rankAlternativeProducts(req, [altA, altB]);
    expect(result.alternatives[0].fingerprint).toBe("samsung|galaxy a55");
    expect(result.alternatives[0].alternativeScore).toBeGreaterThan(result.alternatives[1].alternativeScore);
  });

  test("5. Identity-confidence tie-breaking", () => {
    const altA: AlternativeProduct = {
      product: candidateA55Amazon.product,
      fingerprint: "samsung|galaxy a55",
      similarityScore: 80,
      requirementFitScore: 80,
      preferenceFitScore: 80,
      identityConfidence: 95,
      reason: "Alt A"
    };

    const altB: AlternativeProduct = {
      product: candidatePixel8.product,
      fingerprint: "google|pixel 8",
      similarityScore: 80,
      requirementFitScore: 80,
      preferenceFitScore: 80,
      identityConfidence: 75,
      reason: "Alt B"
    };

    const req = buildRecommendationRequest("Smartphone");
    req.candidates = [candidateS24Amazon];

    const result = rankAlternativeProducts(req, [altA, altB]);
    expect(result.alternatives[0].fingerprint).toBe("samsung|galaxy a55");
  });

  test("6. Fingerprint deterministic tie-breaking", () => {
    const altA: AlternativeProduct = {
      product: candidateA55Amazon.product,
      fingerprint: "brand|prod-b",
      similarityScore: 80,
      requirementFitScore: 80,
      preferenceFitScore: 80,
      identityConfidence: 80,
      reason: "Alt B"
    };

    const altB: AlternativeProduct = {
      product: candidatePixel8.product,
      fingerprint: "brand|prod-a",
      similarityScore: 80,
      requirementFitScore: 80,
      preferenceFitScore: 80,
      identityConfidence: 80,
      reason: "Alt A"
    };

    const req = buildRecommendationRequest("Smartphone");
    req.candidates = [candidateS24Amazon];

    const result = rankAlternativeProducts(req, [altA, altB]);
    expect(result.alternatives[0].fingerprint).toBe("brand|prod-a");
    expect(result.alternatives[1].fingerprint).toBe("brand|prod-b");
  });

  test("7. Primary product fingerprint exclusion", () => {
    const altPrimary: AlternativeProduct = {
      product: candidateS24Amazon.product,
      fingerprint: "samsung|galaxy s24",
      similarityScore: 100,
      requirementFitScore: 100,
      preferenceFitScore: 100,
      identityConfidence: 100,
      reason: "Primary product"
    };

    const altA55: AlternativeProduct = {
      product: candidateA55Amazon.product,
      fingerprint: "samsung|galaxy a55",
      similarityScore: 80,
      requirementFitScore: 80,
      preferenceFitScore: 80,
      identityConfidence: 80,
      reason: "Alt A55"
    };

    const req = buildRecommendationRequest("Samsung phone");
    req.candidates = [candidateS24Amazon, candidateA55Amazon];

    const result = rankAlternativeProducts(req, [altPrimary, altA55]);
    const altFingerprints = result.alternatives.map(a => a.fingerprint);
    expect(altFingerprints).not.toContain("samsung|galaxy s24");
    expect(altFingerprints).toContain("samsung|galaxy a55");
  });

  test("8. Ineligible candidate hard-constraint exclusion", () => {
    const req: RecommendationRequest = {
      hardConstraints: [{ attribute: "brand", operator: "equals", value: "samsung" }],
      candidates: [candidateS24Amazon, candidateIPhone15]
    };

    const result = rankAlternativeProducts(req);
    expect(result.alternatives).toHaveLength(0);
    expect(result.selectedAlternative).toBeNull();
  });

  test("9. Maximum 3 alternatives cap", () => {
    const req = buildRecommendationRequest("Smartphone");
    req.candidates = [
      candidateS24Amazon,
      candidateA55Amazon,
      candidateIPhone15,
      candidatePixel8,
      candidateOnePlus12
    ];

    const result = rankAlternativeProducts(req);
    expect(result.evaluatedAlternativeCount).toBe(4);
    expect(result.alternatives.length).toBeLessThanOrEqual(3);
    expect(result.alternatives).toHaveLength(3);
  });

  test("10. No alternatives handling (selectedAlternative: null)", () => {
    const req = buildRecommendationRequest("Samsung phone");
    req.candidates = [candidateS24Amazon];

    const result = rankAlternativeProducts(req);
    expect(result.alternatives).toEqual([]);
    expect(result.selectedAlternative).toBeNull();
    expect(result.evaluatedAlternativeCount).toBe(0);
  });

  test("11. Single alternative handling", () => {
    const req = buildRecommendationRequest("Samsung phone");
    req.explicitRequirements = [{ attribute: "brand", operator: "equals", value: "samsung" }];
    req.candidates = [candidateS24Amazon, candidateA55Amazon];

    const result = rankAlternativeProducts(req);
    expect(result.alternatives).toHaveLength(1);
    expect(result.selectedAlternative?.fingerprint).toBe("samsung|galaxy a55");
    expect(result.selectedAlternative?.rank).toBe(1);
  });

  test("12. Multiple alternatives rank numbering (1, 2, 3)", () => {
    const req = buildRecommendationRequest("Smartphone");
    req.candidates = [
      candidateS24Amazon,
      candidateA55Amazon,
      candidateIPhone15,
      candidatePixel8
    ];

    const result = rankAlternativeProducts(req);
    expect(result.alternatives[0].rank).toBe(1);
    expect(result.alternatives[1].rank).toBe(2);
    expect(result.alternatives[2].rank).toBe(3);
  });

  test("13. Same-product offers are not alternative products", () => {
    const candidateS24Flipkart: RecommendationCandidate = {
      ...candidateS24Amazon,
      product: {
        ...candidateS24Amazon.product,
        originalPrice: 42000,
        metadata: { marketplace: "Flipkart", hostname: "flipkart.com", detectedAt: Date.now() }
      }
    };

    const req = buildRecommendationRequest("Samsung phone");
    req.candidates = [candidateS24Amazon, candidateS24Flipkart];

    const result = rankAlternativeProducts(req);
    expect(result.alternatives).toHaveLength(0);
    expect(result.selectedAlternative).toBeNull();
  });

  test("14. Missing data safety", () => {
    const altSparse: AlternativeProduct = {
      product: {
        brand: null,
        category: null,
        originalPrice: null,
        originalCurrency: null,
        originalTitle: null,
        fingerprint: "sparse|product"
      },
      fingerprint: "sparse|product",
      similarityScore: 50,
      requirementFitScore: 50,
      preferenceFitScore: 50,
      identityConfidence: 50,
      reason: "Sparse"
    };

    const req = buildRecommendationRequest("Smartphone");
    req.candidates = [candidateS24Amazon];

    const result = rankAlternativeProducts(req, [altSparse]);
    expect(result.alternatives).toHaveLength(1);
    expect(result.selectedAlternative?.fingerprint).toBe("sparse|product");
  });

  test("15. Deterministic repeated execution", () => {
    const req = buildRecommendationRequest("Smartphone");
    req.candidates = [candidateS24Amazon, candidateA55Amazon, candidatePixel8, candidateOnePlus12];

    const res1 = rankAlternativeProducts(req);
    const res2 = rankAlternativeProducts(req);

    expect(res1).toEqual(res2);
  });

  test("16. Immutability of input arguments", () => {
    const req = buildRecommendationRequest("Smartphone");
    req.candidates = [candidateS24Amazon, candidateA55Amazon];

    const reqCopy = JSON.parse(JSON.stringify(req));
    const candCopy = JSON.parse(JSON.stringify(candidateS24Amazon));

    rankAlternativeProducts(req);

    expect(req).toEqual(reqCopy);
    expect(candidateS24Amazon).toEqual(candCopy);
  });

  test("17. Null / undefined input safety", () => {
    const res1 = rankAlternativeProducts(null);
    expect(res1.recommendedProduct).toBeNull();
    expect(res1.alternatives).toEqual([]);
    expect(res1.selectedAlternative).toBeNull();

    const res2 = rankAlternativeProducts(undefined);
    expect(res2.recommendedProduct).toBeNull();
    expect(res2.alternatives).toEqual([]);
    expect(res2.selectedAlternative).toBeNull();
  });

  test("18. Realistic laptop/monitor scenario", () => {
    const candLaptopDell: RecommendationCandidate = {
      product: {
        brand: "dell",
        category: "laptop",
        originalPrice: 75000,
        originalCurrency: "INR",
        originalTitle: "Dell XPS 13 Laptop (16GB RAM, 512GB SSD)",
        normalizedTitle: "dell xps 13 laptop 16gb ram 512gb ssd",
        ram: "16GB",
        storage: "512GB",
        model: "XPS 13",
        confidence: 95,
        fingerprint: "dell|xps 13",
        metadata: { marketplace: "DellStore", hostname: "dell.com", detectedAt: Date.now() }
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

    const candLaptopMacBook: RecommendationCandidate = {
      product: {
        brand: "apple",
        category: "laptop",
        originalPrice: 95000,
        originalCurrency: "INR",
        originalTitle: "Apple MacBook Air M2 (16GB RAM, 512GB SSD)",
        normalizedTitle: "apple macbook air m2 16gb ram 512gb ssd",
        ram: "16GB",
        storage: "512GB",
        model: "MacBook Air",
        confidence: 95,
        fingerprint: "apple|macbook air",
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
      identityConfidenceScore: 95,
      qualityScore: 90,
      marketplaceReliabilityScore: 95,
      duplicateRedundancyScore: 0
    };

    const req = buildRecommendationRequest("Dell laptop with 16GB RAM");
    req.explicitRequirements = [{ attribute: "brand", operator: "equals", value: "dell" }];
    req.candidates = [candLaptopDell, candLaptopMacBook];

    const result = rankAlternativeProducts(req);
    expect(result.recommendedProduct?.fingerprint).toBe("dell|xps 13");
    expect(result.selectedAlternative?.fingerprint).toBe("apple|macbook air");
    expect(result.selectedAlternative?.rank).toBe(1);
  });
});
