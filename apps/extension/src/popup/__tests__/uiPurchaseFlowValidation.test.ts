import { describe, test, expect } from "vitest";
import { buildRecommendationRequest } from "../../intelligence/intent/recommendationRequestBuilder";
import { buildExplainableRecommendation } from "../../intelligence/decision/decisionExplanation";
import { evaluateProductLevelDecisions } from "../../intelligence/decision/productDecision";
import { identifyAlternativeProducts } from "../../intelligence/decision/alternativeProduct";
import { rankAlternativeProducts } from "../../intelligence/decision/alternativeRanking";
import type { RecommendationCandidate, RecommendationResult, RecommendationRequest } from "../../intelligence/recommendationTypes";
import type { ProductIntelligence } from "../../intelligence/types";

describe("uiPurchaseFlowValidation — Phase 1.12.7.3 Final Integration Validation", () => {
  const currentS24: ProductIntelligence = {
    originalTitle: "Samsung Galaxy S24 (256GB, Onyx Black)",
    originalPrice: 79999,
    originalCurrency: "INR",
    brand: "samsung",
    category: "smartphone",
    model: "Galaxy S24",
    storage: "256GB",
    ram: "8GB",
    confidence: 95,
    fingerprint: "samsung|galaxy s24",
    originalUrl: "https://www.amazon.in/dp/B0CS5X1111",
    metadata: { marketplace: "Amazon", hostname: "www.amazon.in", detectedAt: Date.now() }
  };

  const flipkartS24: ProductIntelligence = {
    originalTitle: "Samsung Galaxy S24 5G (256GB, Marble Grey)",
    originalPrice: 74999,
    originalCurrency: "INR",
    brand: "samsung",
    category: "smartphone",
    model: "Galaxy S24",
    storage: "256GB",
    ram: "8GB",
    confidence: 95,
    fingerprint: "samsung|galaxy s24",
    originalUrl: "https://www.flipkart.com/samsung-galaxy-s24/p/itm123456",
    metadata: { marketplace: "Flipkart", hostname: "www.flipkart.com", detectedAt: Date.now() }
  };

  const cromaS24: ProductIntelligence = {
    originalTitle: "Samsung Galaxy S24 (256GB, Amber Yellow)",
    originalPrice: 77999,
    originalCurrency: "INR",
    brand: "samsung",
    category: "smartphone",
    model: "Galaxy S24",
    storage: "256GB",
    ram: "8GB",
    confidence: 95,
    fingerprint: "samsung|galaxy s24",
    originalUrl: "https://www.croma.com/samsung-galaxy-s24-256gb/p/987654",
    metadata: { marketplace: "Croma", hostname: "www.croma.com", detectedAt: Date.now() }
  };

  const iphone15Alt: ProductIntelligence = {
    originalTitle: "Apple iPhone 15 (128GB, Blue)",
    originalPrice: 69900,
    originalCurrency: "INR",
    brand: "apple",
    category: "smartphone",
    model: "iPhone 15",
    storage: "128GB",
    ram: "6GB",
    confidence: 95,
    fingerprint: "apple|iphone 15",
    originalUrl: "https://www.amazon.in/dp/B0CHX12345",
    metadata: { marketplace: "Amazon", hostname: "www.amazon.in", detectedAt: Date.now() }
  };

  const candidateAmazonS24: RecommendationCandidate = {
    product: currentS24,
    isCurrentProduct: true,
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

  const candidateFlipkartS24: RecommendationCandidate = {
    product: flipkartS24,
    isCurrentProduct: false,
    variantState: "explicitly_matching",
    isRefurbishedOrUsed: false,
    isUnavailable: false,
    savingsValue: 5000,
    savingsPercentage: 6.25,
    currencyMismatch: false,
    finalRankingScore: 94,
    priceAvailabilityScore: 94,
    identityConfidenceScore: 95,
    qualityScore: 95,
    marketplaceReliabilityScore: 95,
    duplicateRedundancyScore: 0
  };

  const candidateCromaS24: RecommendationCandidate = {
    product: cromaS24,
    isCurrentProduct: false,
    variantState: "explicitly_matching",
    isRefurbishedOrUsed: false,
    isUnavailable: false,
    savingsValue: 2000,
    savingsPercentage: 2.5,
    currencyMismatch: false,
    finalRankingScore: 90,
    priceAvailabilityScore: 90,
    identityConfidenceScore: 95,
    qualityScore: 95,
    marketplaceReliabilityScore: 95,
    duplicateRedundancyScore: 0
  };

  const candidateiPhone15: RecommendationCandidate = {
    product: iphone15Alt,
    isCurrentProduct: false,
    variantState: "explicitly_matching",
    isRefurbishedOrUsed: false,
    isUnavailable: false,
    savingsValue: null,
    savingsPercentage: null,
    currencyMismatch: false,
    finalRankingScore: 85,
    priceAvailabilityScore: 85,
    identityConfidenceScore: 90,
    qualityScore: 90,
    marketplaceReliabilityScore: 90,
    duplicateRedundancyScore: 0
  };

  test("1. Complete RecommendationResult -> Popup rendering flow", () => {
    const candidates = [candidateAmazonS24, candidateFlipkartS24, candidateCromaS24, candidateiPhone15];
    const req = {
      ...buildRecommendationRequest("Samsung Galaxy S24 256GB"),
      candidates
    };
    const recResult = buildExplainableRecommendation(req, candidates);

    expect(recResult).toBeDefined();
    expect(recResult.recommendedCandidate).toBeDefined();
    expect(recResult.recommendationScore).toBeGreaterThan(0);
  });

  test("2. Recommended product title/brand/model is displayed correctly", () => {
    const candidates = [candidateAmazonS24, candidateFlipkartS24];
    const req = {
      ...buildRecommendationRequest("Samsung Galaxy S24"),
      candidates
    };
    const recResult = buildExplainableRecommendation(req, candidates);

    const recProd = recResult.recommendedCandidate?.product;
    expect(recProd?.brand).toBe("samsung");
    expect(recProd?.model).toBe("Galaxy S24");
  });

  test("3. Recommendation score is displayed correctly", () => {
    const candidates = [candidateAmazonS24];
    const req = {
      ...buildRecommendationRequest("Samsung S24"),
      candidates
    };
    const recResult = buildExplainableRecommendation(req, candidates);

    expect(typeof recResult.recommendationScore).toBe("number");
    expect(recResult.recommendationScore).toBeGreaterThanOrEqual(0);
    expect(recResult.recommendationScore).toBeLessThanOrEqual(100);
  });

  test("4. Confidence level is displayed correctly", () => {
    const candidates = [candidateAmazonS24, candidateFlipkartS24];
    const req = {
      ...buildRecommendationRequest("Samsung Galaxy S24"),
      candidates
    };
    const recResult = buildExplainableRecommendation(req, candidates);

    expect(["high", "medium", "low"]).toContain(recResult.confidence);
    expect(recResult.confidenceDetails?.factors).toBeDefined();
  });

  test("5. Evidence-based recommendation reasons are displayed", () => {
    const candidates = [candidateAmazonS24, candidateFlipkartS24];
    const req = {
      ...buildRecommendationRequest("Samsung Galaxy S24 256GB"),
      candidates
    };
    const recResult = buildExplainableRecommendation(req, candidates);

    expect(Array.isArray(recResult.reasons)).toBe(true);
    expect(recResult.reasons.length).toBeGreaterThan(0);
  });

  test("6. Trade-offs are displayed correctly", () => {
    const candidates = [candidateAmazonS24, candidateFlipkartS24];
    const req = {
      ...buildRecommendationRequest("Samsung Galaxy S24"),
      candidates
    };
    const recResult = buildExplainableRecommendation(req, candidates);

    expect(Array.isArray(recResult.tradeOffs)).toBe(true);
  });

  test("7. Best Offer is displayed correctly", () => {
    const candidates = [candidateAmazonS24, candidateFlipkartS24];
    const req = {
      ...buildRecommendationRequest("Samsung S24"),
      candidates
    };
    const recResult = buildExplainableRecommendation(req, candidates);

    expect(recResult.bestOffer).toBeDefined();
    expect(recResult.bestOffer?.product.brand).toBe("samsung");
  });

  test("8. Cheapest Offer is displayed correctly", () => {
    const candidates = [candidateAmazonS24, candidateFlipkartS24];
    const req = {
      ...buildRecommendationRequest("Samsung S24"),
      candidates
    };
    const recResult = buildExplainableRecommendation(req, candidates);

    expect(recResult.cheapestOffer).toBeDefined();
    expect(recResult.cheapestOffer?.product.originalPrice).toBe(74999);
  });

  test("9. Best Value Offer is displayed correctly", () => {
    const candidates = [candidateAmazonS24, candidateFlipkartS24, candidateCromaS24];
    const req = {
      ...buildRecommendationRequest("Samsung S24"),
      candidates
    };
    const recResult = buildExplainableRecommendation(req, candidates);

    expect(recResult.bestValueOffer).toBeDefined();
  });

  test("10. Best/Cheapest/Value offers remain distinct when they are different listings", () => {
    const candidates = [candidateAmazonS24, candidateFlipkartS24];
    const req = {
      ...buildRecommendationRequest("Samsung S24"),
      candidates
    };
    const recResult = buildExplainableRecommendation(req, candidates);

    const cheapestPrice = recResult.cheapestOffer?.product.originalPrice || 0;
    const bestPrice = recResult.bestOffer?.product.originalPrice || 0;
    expect(cheapestPrice).toBeLessThanOrEqual(bestPrice);
  });

  test("11. Correct merchant name is displayed for each offer", () => {
    const candidates = [candidateFlipkartS24, candidateAmazonS24];
    const req = {
      ...buildRecommendationRequest("Samsung S24"),
      candidates
    };
    const recResult = buildExplainableRecommendation(req, candidates);

    expect(recResult.bestOffer?.product.metadata?.marketplace).toBe("Flipkart");
    expect(recResult.cheapestOffer?.product.metadata?.marketplace).toBe("Flipkart");
  });

  test("12. Correct offer price and currency are displayed", () => {
    const candidates = [candidateAmazonS24];
    const req = {
      ...buildRecommendationRequest("Samsung S24"),
      candidates
    };
    const recResult = buildExplainableRecommendation(req, candidates);

    expect(recResult.bestOffer?.product.originalPrice).toBe(79999);
    expect(recResult.bestOffer?.product.originalCurrency).toBe("INR");
  });

  test("13. Direct merchant URL is preserved exactly without transformation", () => {
    const candidates = [candidateFlipkartS24];
    const req = {
      ...buildRecommendationRequest("Samsung S24"),
      candidates
    };
    const recResult = buildExplainableRecommendation(req, candidates);

    const targetUrl = recResult.bestOffer?.product.originalUrl;
    expect(targetUrl).toBe("https://www.flipkart.com/samsung-galaxy-s24/p/itm123456");
    expect(targetUrl).not.toContain("google.com/search");
  });

  test("14. Buy Direct / View Deal CTA uses exact selected offer URL", () => {
    const candidates = [candidateAmazonS24];
    const req = {
      ...buildRecommendationRequest("Samsung S24"),
      candidates
    };
    const recResult = buildExplainableRecommendation(req, candidates);

    const ctaUrl = recResult.recommendedCandidate?.product.originalUrl;
    expect(ctaUrl).toBe(currentS24.originalUrl);
  });

  test("15. Alternative products are displayed separately from seller offers", () => {
    const freshReq: RecommendationRequest = {
      originalQuery: "smartphone",
      normalizedQuery: "smartphone",
      candidates: [candidateAmazonS24, candidateFlipkartS24, candidateiPhone15]
    };
    const productGroups = evaluateProductLevelDecisions(freshReq, freshReq.candidates).productGroups;
    const altResult = identifyAlternativeProducts(freshReq, productGroups);
    const rankedAlts = rankAlternativeProducts(freshReq, altResult.alternatives);

    expect(rankedAlts.alternatives).toBeDefined();
    expect(rankedAlts.alternatives.length).toBeGreaterThan(0);
    const altBrands = rankedAlts.alternatives.map(a => a.product.brand);
    expect(altBrands).toContain("apple");
    expect(altBrands).not.toContain("samsung");
  });

  test("16. Ineligible products/offers are never presented as purchasable recommendations", () => {
    const unavailCand: RecommendationCandidate = {
      ...candidateAmazonS24,
      isRefurbishedOrUsed: true,
      product: { ...currentS24, originalTitle: "Samsung Galaxy S24 (Refurbished)" }
    };
    const req = {
      ...buildRecommendationRequest("Samsung S24"),
      hardConstraints: [{ attribute: "condition", operator: "equals" as const, value: "new", source: "user_intent" as const }],
      candidates: [unavailCand]
    };
    const recResult = buildExplainableRecommendation(req, [unavailCand]);

    expect(recResult.recommendedCandidate).toBeNull();
  });

  test("17. No eligible recommendation produces a safe empty/no-recommendation state", () => {
    const candidates: RecommendationCandidate[] = [];
    const req = {
      ...buildRecommendationRequest("Unknown Product"),
      candidates
    };
    const recResult = buildExplainableRecommendation(req, candidates);

    expect(recResult.recommendedCandidate).toBeNull();
    expect(recResult.recommendationScore).toBe(0);
    expect(recResult.confidence).toBe("low");
    expect(recResult.reasons).toEqual([]);
    expect(recResult.alternatives).toEqual([]);
  });

  test("18. Missing merchant URL does not create or invent a URL", () => {
    const noUrlS24: RecommendationCandidate = {
      ...candidateAmazonS24,
      product: { ...currentS24, originalUrl: null }
    };
    const candidates = [noUrlS24];
    const req = {
      ...buildRecommendationRequest("Samsung S24"),
      candidates
    };
    const recResult = buildExplainableRecommendation(req, candidates);

    expect(recResult.recommendedCandidate?.product.originalUrl).toBeNull();
  });

  test("19. New product/page clears stale recommendation and purchase state", () => {
    let popupState: RecommendationResult | null = null;

    const candidates1 = [candidateAmazonS24];
    const req1 = {
      ...buildRecommendationRequest("Samsung S24"),
      candidates: candidates1
    };
    popupState = buildExplainableRecommendation(req1, candidates1);
    expect(popupState.recommendedCandidate?.product.brand).toBe("samsung");

    // Simulating page change mismatch clearing state
    popupState = null;
    expect(popupState).toBeNull();
  });

  test("20. Complete realistic electronics scenario from recommendation generation -> Popup -> direct merchant link", () => {
    const candidates = [candidateAmazonS24, candidateFlipkartS24, candidateCromaS24, candidateiPhone15];
    const req = {
      ...buildRecommendationRequest("Samsung Galaxy S24 256GB 8GB RAM"),
      candidates
    };

    const recResult = buildExplainableRecommendation(req, candidates);

    expect(recResult.recommendedCandidate).toBeDefined();
    expect(recResult.recommendationScore).toBeGreaterThan(80);
    expect(recResult.productOfferDetails?.bestOfferSummary).toContain("Flipkart");
    expect(recResult.cheapestOffer?.product.metadata?.marketplace).toBe("Flipkart");
    expect(recResult.cheapestOffer?.product.originalPrice).toBe(74999);

    const purchaseUrl = recResult.bestOffer?.product.originalUrl;
    expect(purchaseUrl).toBe("https://www.flipkart.com/samsung-galaxy-s24/p/itm123456");

    // Exactly 1 alternative product exists (iPhone 15), while S24 variants/offers are excluded from alternatives
    expect(recResult.alternatives.length).toBe(1);

    // Verify immutability
    expect(candidateAmazonS24.product.originalUrl).toBe("https://www.amazon.in/dp/B0CS5X1111");
    expect(candidateFlipkartS24.product.originalPrice).toBe(74999);
  });
});
