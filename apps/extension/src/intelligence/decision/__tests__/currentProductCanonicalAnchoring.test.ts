import { describe, test, expect } from "vitest";
import { evaluateProductLevelDecisions } from "../productDecision";
import { evaluateOfferLevelDecisions } from "../offerDecision";
import { identifyAlternativeProducts } from "../alternativeProduct";
import { buildExplainableRecommendation } from "../decisionExplanation";
import type { RecommendationRequest, RecommendationCandidate } from "../../recommendationTypes";

describe("Phase 5.X — Current-Product Canonical Group Anchoring Tests", () => {
  // Current Myntra standalone product: Maybelline Colossal Bold Liner 3ml (Black)
  const currentMyntraLiner: RecommendationCandidate = {
    product: {
      originalTitle: "Maybelline New York Colossal Bold Liner - Black - 3ml",
      originalPrice: 249,
      originalCurrency: "INR",
      brand: "Maybelline",
      model: "Colossal Bold Liner",
      category: "Beauty",
      volume: "3ml",
      color: "Black",
      packCount: 1,
      fingerprint: "maybelline|colossal bold liner|3ml",
      confidence: 80,
      originalUrl: "https://www.myntra.com/eyeliner/maybelline/colossal-bold-liner-3ml/buy",
      metadata: {
        marketplace: "Myntra",
        hostname: "www.myntra.com",
        detectedAt: Date.now(),
      },
    },
    isCurrentProduct: true,
    variantState: "explicitly_matching",
    isRefurbishedOrUsed: false,
    isUnavailable: false,
    currencyMismatch: false,
    identityConfidenceScore: 80,
    duplicateRedundancyScore: 0,
    marketplaceReliabilityScore: 95,
    finalRankingScore: 80,
    qualityScore: 85,
    priceAvailabilityScore: 80,
  };

  // Same product from Nykaa (cheaper price)
  const nykaaStandaloneLiner: RecommendationCandidate = {
    product: {
      originalTitle: "Maybelline New York Colossal Bold Liner 3ml - Black",
      originalPrice: 199, // Cheaper!
      originalCurrency: "INR",
      brand: "Maybelline",
      model: "Colossal Bold Liner",
      category: "Beauty",
      volume: "3ml",
      color: "Black",
      packCount: 1,
      fingerprint: "maybelline|colossal bold liner|3ml",
      confidence: 85,
      originalUrl: "https://www.nykaa.com/maybelline-colossal-bold-liner-3ml/p/1",
      metadata: {
        marketplace: "Nykaa",
        hostname: "www.nykaa.com",
        detectedAt: Date.now(),
      },
    },
    isCurrentProduct: false,
    variantState: "explicitly_matching",
    isRefurbishedOrUsed: false,
    isUnavailable: false,
    currencyMismatch: false,
    identityConfidenceScore: 85,
    duplicateRedundancyScore: 0,
    marketplaceReliabilityScore: 95,
    finalRankingScore: 90,
    qualityScore: 90,
    priceAvailabilityScore: 95,
  };

  // Discovered Combo Pack with higher confidence (Liner + Mascara pack)
  const discoveredComboPack: RecommendationCandidate = {
    product: {
      originalTitle: "Maybelline New York Colossal Bold Liner & Hypercurl Mascara Combo Pack",
      originalPrice: 499,
      originalCurrency: "INR",
      brand: "Maybelline",
      model: "Colossal Bold Liner & Hypercurl Mascara Combo",
      category: "Beauty",
      packCount: 2,
      fingerprint: "maybelline|colossal bold liner hypercurl mascara combo",
      confidence: 98, // Higher confidence score!
      originalUrl: "https://www.myntra.com/makeup-combo/maybelline-combo/buy",
      metadata: {
        marketplace: "Myntra",
        hostname: "www.myntra.com",
        detectedAt: Date.now(),
      },
    },
    isCurrentProduct: false,
    variantState: "explicitly_conflicting",
    isRefurbishedOrUsed: false,
    isUnavailable: false,
    currencyMismatch: false,
    identityConfidenceScore: 98,
    duplicateRedundancyScore: 0,
    marketplaceReliabilityScore: 95,
    finalRankingScore: 95,
    qualityScore: 95,
    priceAvailabilityScore: 90,
  };

  // Test A: Current-page standalone product vs higher-confidence combo
  test("A. Current-page standalone product remains primary comparison group despite higher-confidence combo", () => {
    const candidates = [currentMyntraLiner, nykaaStandaloneLiner, discoveredComboPack];
    const req: RecommendationRequest = {
      productContext: { currentProduct: currentMyntraLiner.product },
      candidates,
    };

    const prodDec = evaluateProductLevelDecisions(req, candidates);

    // bestProductGroup MUST be the standalone liner, NOT the combo pack
    expect(prodDec.bestProductGroup).toBeDefined();
    expect(prodDec.bestProductGroup?.fingerprint).toContain("colossal bold liner|3ml");
    expect(prodDec.bestProductGroup?.offers.some(o => o.isCurrentProduct)).toBe(true);
    expect(prodDec.bestProductGroup?.fingerprint).not.toContain("combo");
  });

  // Test B: Current-page product vs different size/volume
  test("B. Current-page product vs different size/volume: current variant remains primary", () => {
    const larger5mlVariant: RecommendationCandidate = {
      ...nykaaStandaloneLiner,
      product: {
        ...nykaaStandaloneLiner.product!,
        originalTitle: "Maybelline Colossal Bold Liner 5ml",
        volume: "5ml",
        fingerprint: "maybelline|colossal bold liner|5ml",
        confidence: 99,
      },
    };

    const candidates = [currentMyntraLiner, nykaaStandaloneLiner, larger5mlVariant];
    const req: RecommendationRequest = {
      productContext: { currentProduct: currentMyntraLiner.product },
      candidates,
    };

    const prodDec = evaluateProductLevelDecisions(req, candidates);
    expect(prodDec.bestProductGroup?.fingerprint).toContain("3ml");
    expect(prodDec.bestProductGroup?.fingerprint).not.toContain("5ml");
  });

  // Test C: Current-page product vs different model
  test("C. Current-page product vs different model: current model remains primary", () => {
    const tattooLinerModel: RecommendationCandidate = {
      ...nykaaStandaloneLiner,
      product: {
        ...nykaaStandaloneLiner.product!,
        originalTitle: "Maybelline Tattoo Liner 48H",
        model: "Tattoo Liner",
        fingerprint: "maybelline|tattoo liner",
        confidence: 99,
      },
    };

    const candidates = [currentMyntraLiner, nykaaStandaloneLiner, tattooLinerModel];
    const req: RecommendationRequest = {
      productContext: { currentProduct: currentMyntraLiner.product },
      candidates,
    };

    const prodDec = evaluateProductLevelDecisions(req, candidates);
    expect(prodDec.bestProductGroup?.fingerprint).toContain("colossal bold liner");
    expect(prodDec.bestProductGroup?.fingerprint).not.toContain("tattoo liner");
  });

  // Test D: Valid same-product offers from other merchants remain in primary group
  test("D. Valid same-product offers from other merchants remain in primary group", () => {
    const candidates = [currentMyntraLiner, nykaaStandaloneLiner, discoveredComboPack];
    const req: RecommendationRequest = {
      productContext: { currentProduct: currentMyntraLiner.product },
      candidates,
    };

    const prodDec = evaluateProductLevelDecisions(req, candidates);
    const offerDec = evaluateOfferLevelDecisions(req, prodDec.bestProductGroup, candidates);

    // Primary group contains both Myntra and Nykaa standalone offers
    const merchants = offerDec.allEligibleOffers?.map(o => o.product?.metadata?.marketplace);
    expect(merchants).toContain("Myntra");
    expect(merchants).toContain("Nykaa");
    expect(offerDec.allEligibleOffers?.length).toBe(2);
  });

  // Test E: Cheapest valid same-product offer can come from another merchant
  test("E. Cheapest valid same-product offer comes from Nykaa (₹199 vs Myntra ₹249)", () => {
    const candidates = [currentMyntraLiner, nykaaStandaloneLiner, discoveredComboPack];
    const req: RecommendationRequest = {
      productContext: { currentProduct: currentMyntraLiner.product },
      candidates,
    };

    const prodDec = evaluateProductLevelDecisions(req, candidates);
    const offerDec = evaluateOfferLevelDecisions(req, prodDec.bestProductGroup, candidates);

    expect(offerDec.cheapestOffer).toBe(nykaaStandaloneLiner);
    expect(offerDec.cheapestOffer?.product?.originalPrice).toBe(199);
    expect(offerDec.cheapestOffer?.product?.metadata?.marketplace).toBe("Nykaa");
  });

  // Test F: Best-value offer can come from another merchant
  test("F. Best-value offer can come from another merchant", () => {
    const candidates = [currentMyntraLiner, nykaaStandaloneLiner, discoveredComboPack];
    const req: RecommendationRequest = {
      productContext: { currentProduct: currentMyntraLiner.product },
      candidates,
    };

    const prodDec = evaluateProductLevelDecisions(req, candidates);
    const offerDec = evaluateOfferLevelDecisions(req, prodDec.bestProductGroup, candidates);

    expect(offerDec.bestValueOffer).toBe(nykaaStandaloneLiner);
    expect(offerDec.bestValueOffer?.product?.metadata?.marketplace).toBe("Nykaa");
  });

  // Test G: Different combo/bundle is retained as an alternative product
  test("G. Different combo/bundle is retained as an alternative product rather than primary", () => {
    const candidates = [currentMyntraLiner, nykaaStandaloneLiner, discoveredComboPack];
    const req: RecommendationRequest = {
      productContext: { currentProduct: currentMyntraLiner.product },
      candidates,
    };

    const altResult = identifyAlternativeProducts(req);
    expect(altResult.recommendedProduct?.fingerprint).toContain("colossal bold liner|3ml");
    expect(altResult.alternatives.some(a => a.fingerprint.includes("combo") || (a.product.model || "").includes("Combo"))).toBe(true);
  });

  // End-to-end explainable recommendation test
  test("End-to-End: Full explainable recommendation preserves standalone offers across merchants", () => {
    const candidates = [currentMyntraLiner, nykaaStandaloneLiner, discoveredComboPack];
    const req: RecommendationRequest = {
      productContext: { currentProduct: currentMyntraLiner.product },
      candidates,
    };

    const recResult = buildExplainableRecommendation(req, candidates);
    expect(recResult.recommendedCandidate).toBeDefined();
    expect(recResult.allEligibleOffers?.length).toBe(2);
    expect(recResult.cheapestOffer?.product?.metadata?.marketplace).toBe("Nykaa");
    expect(recResult.alternatives.length).toBeGreaterThanOrEqual(1);
  });
});
