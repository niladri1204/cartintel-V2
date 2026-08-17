import { describe, test, expect } from "vitest";
import { buildRecommendationRequest } from "../../intent/recommendationRequestBuilder";
import { evaluateProductLevelDecisions } from "../productDecision";
import { identifyAlternativeProducts } from "../alternativeProduct";
import { rankAlternativeProducts } from "../alternativeRanking";
import type { RecommendationCandidate, RecommendationRequest } from "../../recommendationTypes";
import type { AlternativeProduct } from "../decisionTypes";

describe("alternativeRecommendationValidation - Phase 1.12.6.3 Alternative Recommendation End-to-End Validation", () => {
  const s24Amazon: RecommendationCandidate = {
    product: {
      brand: "samsung",
      category: "smartphone",
      originalPrice: 45000,
      originalCurrency: "INR",
      originalTitle: "Samsung Galaxy S24 (256GB, Black)",
      normalizedTitle: "samsung galaxy s24 256gb black",
      storage: "256GB",
      model: "Galaxy S24",
      confidence: 95,
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
    finalRankingScore: 95,
    priceAvailabilityScore: 95,
    identityConfidenceScore: 95,
    qualityScore: 95,
    marketplaceReliabilityScore: 95,
    duplicateRedundancyScore: 0
  };

  const s24Flipkart: RecommendationCandidate = {
    product: {
      brand: "samsung",
      category: "smartphone",
      originalPrice: 43000,
      originalCurrency: "INR",
      originalTitle: "Samsung Galaxy S24 (256GB, Grey)",
      normalizedTitle: "samsung galaxy s24 256gb grey",
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

  const s24Croma: RecommendationCandidate = {
    product: {
      brand: "samsung",
      category: "smartphone",
      originalPrice: 44000,
      originalCurrency: "INR",
      originalTitle: "Samsung Galaxy S24 (256GB, Silver)",
      normalizedTitle: "samsung galaxy s24 256gb silver",
      storage: "256GB",
      model: "Galaxy S24",
      confidence: 95,
      fingerprint: "samsung|galaxy s24",
      metadata: { marketplace: "Croma", hostname: "croma.com", detectedAt: Date.now() }
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

  const a55Amazon: RecommendationCandidate = {
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

  const iphone15Amazon: RecommendationCandidate = {
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
    finalRankingScore: 92,
    priceAvailabilityScore: 92,
    identityConfidenceScore: 95,
    qualityScore: 92,
    marketplaceReliabilityScore: 95,
    duplicateRedundancyScore: 0
  };

  const pixel8Amazon: RecommendationCandidate = {
    product: {
      brand: "google",
      category: "smartphone",
      originalPrice: 55000,
      originalCurrency: "INR",
      originalTitle: "Google Pixel 8 (128GB)",
      normalizedTitle: "google pixel 8 128gb",
      storage: "128GB",
      model: "Pixel 8",
      confidence: 90,
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
    identityConfidenceScore: 90,
    qualityScore: 88,
    marketplaceReliabilityScore: 90,
    duplicateRedundancyScore: 0
  };

  const oneplus12Amazon: RecommendationCandidate = {
    product: {
      brand: "oneplus",
      category: "smartphone",
      originalPrice: 60000,
      originalCurrency: "INR",
      originalTitle: "OnePlus 12 (256GB)",
      normalizedTitle: "oneplus 12 256gb",
      storage: "256GB",
      model: "12",
      confidence: 88,
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
    identityConfidenceScore: 88,
    qualityScore: 87,
    marketplaceReliabilityScore: 90,
    duplicateRedundancyScore: 0
  };

  test("1. Complete request -> product -> alternative identification -> ranking flow", () => {
    const req = buildRecommendationRequest("Samsung phone");
    req.explicitRequirements = [{ attribute: "brand", operator: "equals", value: "samsung" }];
    req.candidates = [s24Amazon, a55Amazon, iphone15Amazon];

    // Pipeline step 1: Product Decision
    const productDec = evaluateProductLevelDecisions(req);
    expect(productDec.bestProductGroup?.fingerprint).toBe("samsung|galaxy s24");

    // Pipeline step 2: Alternative Identification
    const altIdent = identifyAlternativeProducts(req);
    expect(altIdent.recommendedProduct?.fingerprint).toBe("samsung|galaxy s24");

    // Pipeline step 3: Alternative Ranking
    const altRank = rankAlternativeProducts(req);
    expect(altRank.recommendedProduct?.fingerprint).toBe("samsung|galaxy s24");
    expect(altRank.selectedAlternative).toBeDefined();
    expect(altRank.selectedAlternative?.fingerprint).toBe("samsung|galaxy a55");
  });

  test("2. Correct primary product fingerprint exclusion", () => {
    const req = buildRecommendationRequest("Samsung phone");
    req.explicitRequirements = [{ attribute: "brand", operator: "equals", value: "samsung" }];
    req.candidates = [s24Amazon, a55Amazon];

    const altRank = rankAlternativeProducts(req);
    const fingerprints = altRank.alternatives.map(a => a.fingerprint);
    expect(fingerprints).not.toContain("samsung|galaxy s24");
  });

  test("3. Same-fingerprint offers never becoming alternatives", () => {
    const req = buildRecommendationRequest("Samsung phone");
    req.candidates = [s24Amazon, s24Flipkart, s24Croma];

    const altRank = rankAlternativeProducts(req);
    // 3 offers sharing "samsung|galaxy s24" form 1 primary product group, leaving 0 alternatives
    expect(altRank.alternatives).toHaveLength(0);
    expect(altRank.selectedAlternative).toBeNull();
  });

  test("4. Different fingerprints correctly identified as alternatives", () => {
    const req = buildRecommendationRequest("Smartphone");
    req.candidates = [s24Amazon, a55Amazon, iphone15Amazon];

    const altRank = rankAlternativeProducts(req);
    expect(altRank.evaluatedAlternativeCount).toBe(2);
    expect(altRank.alternatives.length).toBeGreaterThan(0);
  });

  test("5. Hard constraints preserved throughout the entire pipeline", () => {
    const req: RecommendationRequest = {
      hardConstraints: [{ attribute: "brand", operator: "equals", value: "samsung" }],
      candidates: [s24Amazon, iphone15Amazon]
    };

    const altRank = rankAlternativeProducts(req);
    // iPhone 15 violates hard constraint "brand: samsung", so it must NEVER appear as an alternative
    expect(altRank.alternatives).toHaveLength(0);
    expect(altRank.selectedAlternative).toBeNull();
  });

  test("6. Mandatory requirements preserved in alternative fit calculation", () => {
    const req = buildRecommendationRequest("Smartphone with 128GB storage");
    req.candidates = [s24Amazon, a55Amazon, pixel8Amazon];

    const altRank = rankAlternativeProducts(req);
    const selected = altRank.selectedAlternative;
    expect(selected?.requirementFitScore).toBe(100);
  });

  test("7. Soft preferences influence alternative ranking without becoming hard constraints", () => {
    const req = buildRecommendationRequest("Prefer Samsung smartphone");
    req.candidates = [s24Amazon, a55Amazon, iphone15Amazon];

    const altRank = rankAlternativeProducts(req);
    // Apple iPhone 15 is NOT hard-filtered, but Samsung A55 ranks higher due to preference fit
    const a55Alt = altRank.alternatives.find(a => a.fingerprint === "samsung|galaxy a55");
    const iphoneAlt = altRank.alternatives.find(a => a.fingerprint === "apple|iphone 15");

    expect(a55Alt).toBeDefined();
    expect(iphoneAlt).toBeDefined();
    expect(a55Alt?.alternativeScore).toBeGreaterThan(iphoneAlt?.alternativeScore || 0);
  });

  test("8. Correct similarityScore propagation", () => {
    const req = buildRecommendationRequest("Samsung phone");
    req.candidates = [s24Amazon, a55Amazon];

    const altIdent = identifyAlternativeProducts(req);
    const altRank = rankAlternativeProducts(req);

    const identSim = altIdent.alternatives[0].similarityScore;
    const rankSim = altRank.alternatives[0].similarityScore;

    expect(rankSim).toBe(identSim);
  });

  test("9. Correct alternativeScore calculation formula", () => {
    const req = buildRecommendationRequest("Samsung phone");
    req.candidates = [s24Amazon, a55Amazon];

    const altRank = rankAlternativeProducts(req);
    const topAlt = altRank.alternatives[0];

    const expectedScore = Math.round(
      0.40 * topAlt.similarityScore +
      0.30 * topAlt.requirementFitScore +
      0.20 * topAlt.preferenceFitScore +
      0.10 * topAlt.identityConfidence
    );

    expect(topAlt.alternativeScore).toBe(expectedScore);
  });

  test("10. Requirement-fit ranking behavior", () => {
    const altA55: AlternativeProduct = {
      product: a55Amazon.product,
      fingerprint: "samsung|galaxy a55",
      similarityScore: 80,
      requirementFitScore: 100,
      preferenceFitScore: 80,
      identityConfidence: 85,
      reason: "Alt 128GB"
    };
    const altOnePlus: AlternativeProduct = {
      product: oneplus12Amazon.product,
      fingerprint: "oneplus|12",
      similarityScore: 80,
      requirementFitScore: 0,
      preferenceFitScore: 80,
      identityConfidence: 85,
      reason: "Alt 256GB"
    };

    const req = buildRecommendationRequest("Samsung phone");
    req.candidates = [s24Amazon];

    const altRank = rankAlternativeProducts(req, [altA55, altOnePlus]);
    // 100% requirement fit (A55) must outrank 0% requirement fit (OnePlus 12)
    expect(altRank.alternatives[0].fingerprint).toBe("samsung|galaxy a55");
    expect(altRank.alternatives[1].fingerprint).toBe("oneplus|12");
  });

  test("11. Preference-fit ranking behavior", () => {
    const altPixel: AlternativeProduct = {
      product: pixel8Amazon.product,
      fingerprint: "google|pixel 8",
      similarityScore: 80,
      requirementFitScore: 80,
      preferenceFitScore: 100,
      identityConfidence: 90,
      reason: "Alt Pixel 8"
    };
    const altIPhone: AlternativeProduct = {
      product: iphone15Amazon.product,
      fingerprint: "apple|iphone 15",
      similarityScore: 80,
      requirementFitScore: 80,
      preferenceFitScore: 0,
      identityConfidence: 90,
      reason: "Alt iPhone 15"
    };

    const req = buildRecommendationRequest("Smartphone");
    req.candidates = [s24Amazon];

    const altRank = rankAlternativeProducts(req, [altPixel, altIPhone]);
    // Google Pixel 8 matches user preference (100% preference fit), so it ranks 1st among alternatives
    expect(altRank.selectedAlternative?.fingerprint).toBe("google|pixel 8");
  });

  test("12. Identity-confidence tie-breaking", () => {
    const candidateHighConf: RecommendationCandidate = {
      ...a55Amazon,
      product: { ...a55Amazon.product, confidence: 98, fingerprint: "brand|high-conf" }
    };
    const candidateLowConf: RecommendationCandidate = {
      ...a55Amazon,
      product: { ...a55Amazon.product, confidence: 70, fingerprint: "brand|low-conf" }
    };

    const req = buildRecommendationRequest("Smartphone");
    req.candidates = [s24Amazon, candidateLowConf, candidateHighConf];

    const altRank = rankAlternativeProducts(req);
    const highRank = altRank.alternatives.find(a => a.fingerprint === "brand|high-conf")?.rank;
    const lowRank = altRank.alternatives.find(a => a.fingerprint === "brand|low-conf")?.rank;

    expect(highRank).toBeLessThan(lowRank || 999);
  });

  test("13. Fingerprint deterministic tie-breaking", () => {
    const candidateA: RecommendationCandidate = {
      ...a55Amazon,
      product: { ...a55Amazon.product, fingerprint: "brand|prod-b" }
    };
    const candidateB: RecommendationCandidate = {
      ...a55Amazon,
      product: { ...a55Amazon.product, fingerprint: "brand|prod-a" }
    };

    const req = buildRecommendationRequest("Smartphone");
    req.candidates = [s24Amazon, candidateA, candidateB];

    const altRank = rankAlternativeProducts(req);
    expect(altRank.alternatives[0].fingerprint).toBe("brand|prod-a");
    expect(altRank.alternatives[1].fingerprint).toBe("brand|prod-b");
  });

  test("14. Maximum 3 alternatives cap", () => {
    const req = buildRecommendationRequest("Smartphone");
    req.candidates = [
      s24Amazon,
      a55Amazon,
      iphone15Amazon,
      pixel8Amazon,
      oneplus12Amazon
    ];

    const altRank = rankAlternativeProducts(req);
    expect(altRank.evaluatedAlternativeCount).toBe(4);
    expect(altRank.alternatives).toHaveLength(3);
  });

  test("15. Correct selectedAlternative selection (rank 1)", () => {
    const req = buildRecommendationRequest("Samsung phone");
    req.candidates = [s24Amazon, a55Amazon, iphone15Amazon];

    const altRank = rankAlternativeProducts(req);
    expect(altRank.selectedAlternative).toEqual(altRank.alternatives[0]);
    expect(altRank.selectedAlternative?.rank).toBe(1);
  });

  test("16. No alternatives -> selectedAlternative = null", () => {
    const req = buildRecommendationRequest("Samsung phone");
    req.candidates = [s24Amazon];

    const altRank = rankAlternativeProducts(req);
    expect(altRank.alternatives).toEqual([]);
    expect(altRank.selectedAlternative).toBeNull();
  });

  test("17. Multi-product / multi-offer electronics scenario", () => {
    const req = buildRecommendationRequest("Samsung phone");
    req.explicitRequirements = [{ attribute: "brand", operator: "equals", value: "samsung" }];
    req.candidates = [
      s24Amazon, s24Flipkart, s24Croma,
      a55Amazon,
      iphone15Amazon,
      pixel8Amazon,
      oneplus12Amazon
    ];

    const altRank = rankAlternativeProducts(req);
    // Primary product: S24 (from 3 offers).
    expect(altRank.recommendedProduct?.fingerprint).toBe("samsung|galaxy s24");
    // Alternatives: 4 distinct fingerprints (A55, iPhone 15, Pixel 8, OnePlus 12).
    // Cap: top 3 returned.
    expect(altRank.evaluatedAlternativeCount).toBe(4);
    expect(altRank.alternatives).toHaveLength(3);
    expect(altRank.selectedAlternative).toBeDefined();
  });

  test("18. Missing-data safety", () => {
    const candidateSparse: RecommendationCandidate = {
      product: {
        brand: null,
        category: null,
        originalPrice: null,
        originalCurrency: null,
        originalTitle: null,
        fingerprint: "sparse|product"
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
    req.candidates = [s24Amazon, candidateSparse];

    const altRank = rankAlternativeProducts(req);
    expect(altRank.alternatives).toHaveLength(1);
    expect(altRank.selectedAlternative?.fingerprint).toBe("sparse|product");
  });

  test("19. Deterministic repeated execution", () => {
    const req = buildRecommendationRequest("Smartphone");
    req.candidates = [s24Amazon, a55Amazon, iphone15Amazon, pixel8Amazon];

    const run1 = rankAlternativeProducts(req);
    const run2 = rankAlternativeProducts(req);

    expect(run1).toEqual(run2);
  });

  test("20. Full request / candidate / product immutability", () => {
    const req = buildRecommendationRequest("Samsung phone");
    req.candidates = [s24Amazon, a55Amazon, iphone15Amazon];

    const reqCopy = JSON.parse(JSON.stringify(req));
    const candCopy = JSON.parse(JSON.stringify(s24Amazon));

    rankAlternativeProducts(req);

    expect(req).toEqual(reqCopy);
    expect(s24Amazon).toEqual(candCopy);
  });
});
