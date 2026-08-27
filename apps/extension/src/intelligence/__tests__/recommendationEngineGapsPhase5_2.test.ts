import { describe, test, expect } from "vitest";
import { recommendDeal } from "../recommendation";
import { evaluateProductLevelDecisions } from "../decision/productDecision";
import { evaluateOfferLevelDecisions } from "../decision/offerDecision";
import { identifyAlternativeProducts } from "../decision/alternativeProduct";
import { toRecommendationCandidates } from "../recommendationAdapter";
import { calculateMarketplaceReliability } from "../ranking";
import { processProduct } from "../engine";
import type { RankedDealResult, RankedOffer } from "../ranking";
import type { RecommendationCandidate, RecommendationRequest } from "../recommendationTypes";

describe("Phase 5.2 — Recommendation Engine Gap Fixes & Regression Gate", () => {

  // =========================================================================
  // FIX 1: recommendation.ts return no_matching_offers on empty offers
  // =========================================================================
  test("1. recommendation.ts returns 'no_matching_offers' when there are zero candidate offers", () => {
    const currentProduct = processProduct({
      title: "Samsung Galaxy S24 Ultra 256GB",
      price: 129999,
      currency: "INR",
      image: null,
      url: "https://amazon.in/p/s24",
      hostname: "amazon.in"
    });

    const rankedDeals: RankedDealResult = {
      currentProduct,
      offers: [],
      bestOffer: null,
      hasCurrencyMismatch: false
    };

    const res = recommendDeal(rankedDeals);
    expect(res.state).toBe("no_matching_offers");
    expect(res.reason).toContain("No external merchant offers");
    expect(res.recommendedOffer).toBeNull();
  });

  // =========================================================================
  // FIX 2: productDecision.ts brandless product fallback fingerprinting
  // =========================================================================
  test("2. productDecision.ts generates unique deterministic fallback keys for brandless products", () => {
    const p1 = processProduct({
      title: "Solid Wood Dining Table 4 Seater",
      price: 15000,
      currency: "INR",
      image: null,
      url: "https://furniture.com/table",
      hostname: "furniture.com"
    });

    const p2 = processProduct({
      title: "Ergonomic Office Mesh Chair",
      price: 8000,
      currency: "INR",
      image: null,
      url: "https://furniture.com/chair",
      hostname: "furniture.com"
    });

    const cand1: RecommendationCandidate = {
      product: p1,
      isCurrentProduct: false,
      isRefurbishedOrUsed: false,
      isUnavailable: false,
      currencyMismatch: false,
      identityConfidenceScore: 70
    };

    const cand2: RecommendationCandidate = {
      product: p2,
      isCurrentProduct: false,
      isRefurbishedOrUsed: false,
      isUnavailable: false,
      currencyMismatch: false,
      identityConfidenceScore: 70
    };

    const req: RecommendationRequest = {
      productContext: { currentProduct: p1 },
      candidates: [cand1, cand2]
    };

    const result = evaluateProductLevelDecisions(req);
    expect(result.productGroups.length).toBe(2);
    const keys = result.productGroups.map(g => g.fingerprint);
    expect(keys).not.toContain("unknown_product");
    expect(keys[0]).not.toBe(keys[1]);
  });

  // =========================================================================
  // FIX 3: offerDecision.ts uses productGroup.product as canonical anchor
  // =========================================================================
  test("3. offerDecision.ts uses productGroup.product as canonical anchor for offer family filtering", () => {
    const canonicalProduct = processProduct({
      title: "Samsung Galaxy S24 Ultra 256GB Titanium",
      price: 129999,
      currency: "INR",
      image: null,
      url: "https://amazon.in/s24",
      hostname: "amazon.in"
    });

    const offer1: RecommendationCandidate = {
      product: processProduct({
        title: "Samsung Galaxy S24 Ultra 256GB Gray",
        price: 124999,
        currency: "INR",
        image: null,
        url: "https://croma.com/s24",
        hostname: "croma.com"
      }),
      isCurrentProduct: false,
      isRefurbishedOrUsed: false,
      isUnavailable: false,
      currencyMismatch: false,
      identityConfidenceScore: 95
    };

    const req: RecommendationRequest = {
      productContext: { currentProduct: canonicalProduct },
      candidates: [offer1]
    };

    const productGroup = {
      fingerprint: canonicalProduct.fingerprint || "samsung|galaxy s24 ultra",
      product: canonicalProduct,
      offers: [offer1],
      bestIdentityConfidence: 95,
      lowestPrice: 124999,
      highestPrice: 124999,
      averagePrice: 124999,
      currency: "INR",
      marketplaces: ["Croma"],
      productFitScore: 100,
      requirementFitScore: 100,
      preferenceFitScore: 100,
      isEligible: true
    };

    const offerResult = evaluateOfferLevelDecisions(req, productGroup);
    expect(offerResult.bestOffer).toBeDefined();
    expect(offerResult.bestOffer).toBe(offer1);
  });

  // =========================================================================
  // FIX 4: alternativeProduct.ts evaluates hard-constraint ineligible candidates
  // =========================================================================
  test("4. alternativeProduct.ts evaluates candidates rejected for primary hard constraints", () => {
    const mainProd = processProduct({
      title: "Samsung Galaxy S24 128GB",
      price: 79999,
      currency: "INR",
      image: null,
      url: "https://amazon.in/s24",
      hostname: "amazon.in"
    });

    const mainCandidate: RecommendationCandidate = {
      product: mainProd,
      isCurrentProduct: true,
      isRefurbishedOrUsed: false,
      isUnavailable: false,
      currencyMismatch: false,
      identityConfidenceScore: 100
    };

    const expensiveAltProd = processProduct({
      title: "Samsung Galaxy S24 Ultra 512GB",
      price: 139999,
      currency: "INR",
      image: null,
      url: "https://amazon.in/s24ultra",
      hostname: "amazon.in"
    });

    const expensiveAltCand: RecommendationCandidate = {
      product: expensiveAltProd,
      isCurrentProduct: false,
      isRefurbishedOrUsed: false,
      isUnavailable: false,
      currencyMismatch: false,
      identityConfidenceScore: 90
    };

    const req: RecommendationRequest = {
      productContext: { currentProduct: mainProd },
      candidates: [mainCandidate, expensiveAltCand],
      hardConstraints: [
        { attribute: "price", operator: "less_than_or_equal", value: 80000 }
      ]
    };

    const altResult = identifyAlternativeProducts(req);
    expect(altResult.alternatives.length).toBeGreaterThan(0);
    expect(altResult.alternatives.some(a => (a.product.normalizedTitle || "").includes("s24 ultra"))).toBe(true);
  });

  // =========================================================================
  // FIX 5: recommendationAdapter.ts URL & fingerprint equality
  // =========================================================================
  test("5. recommendationAdapter.ts detects selected best offer via URL and fingerprint equality", () => {
    const p = processProduct({
      title: "Apple iPhone 15 128GB",
      price: 79900,
      currency: "INR",
      image: null,
      url: "https://apple.com/iphone15",
      hostname: "apple.com"
    });

    const offerObj1: RankedOffer = {
      product: p,
      isCurrentProduct: false,
      isRefurbishedOrUsed: false,
      isUnavailable: false,
      currencyMismatch: false
    };

    // Cloned offer object with identical URL & fingerprint
    const offerObj1Clone: RankedOffer = {
      product: JSON.parse(JSON.stringify(p)),
      isCurrentProduct: false,
      isRefurbishedOrUsed: false,
      isUnavailable: false,
      currencyMismatch: false
    };

    const rankedDeals: RankedDealResult = {
      currentProduct: p,
      offers: [offerObj1Clone],
      bestOffer: offerObj1,
      bestListingDetails: {
        selectedOffer: offerObj1,
        selectionTier: "exact_available",
        selectionReason: "Cheapest valid offer",
        isFallbackRequired: false,
        consideredOfferCount: 1
      },
      hasCurrencyMismatch: false
    };

    const candidates = toRecommendationCandidates(rankedDeals);
    expect(candidates).toHaveLength(1);
    expect(candidates[0].selectionTier).toBe("exact_available");
  });

  // =========================================================================
  // FIX 6: ranking.ts fallback marketplace reliability score (35)
  // =========================================================================
  test("6. ranking.ts assigns 35 fallback reliability score to unverified/missing marketplaces", () => {
    const missingMktProduct = processProduct({
      title: "Generic Wireless Mouse",
      price: 500,
      currency: "INR",
      image: null,
      url: null,
      hostname: ""
    });
    missingMktProduct.metadata = { marketplace: "", hostname: "", detectedAt: Date.now() };

    const relDetails = calculateMarketplaceReliability(missingMktProduct);
    expect(relDetails.score).toBe(35);
    expect(relDetails.reliabilityState).toBe("missing_marketplace");
  });
});
