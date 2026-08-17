import { describe, test, expect } from "vitest";
import { toRecommendationCandidates } from "../recommendationAdapter";
import type { RankedDealResult, RankedOffer } from "../ranking";

describe("recommendationAdapter - toRecommendationCandidates", () => {
  const dummyProduct = {
    originalTitle: "Test Product",
    originalPrice: 1000,
    originalCurrency: "INR",
    originalImage: null,
    originalUrl: null,
    brand: null,
    category: null,
    subcategory: null,
    productType: null,
    variant: null,
    quantity: null,
    unit: null,
    packSize: null,
    color: null,
    model: null,
    size: null,
    material: null,
    gender: null,
    storage: null,
    ram: null,
    packCount: null,
    language: null,
    edition: null,
    attributes: [],
    normalizedTitle: "test product",
    metadata: {
      marketplace: "TestMarket",
      hostname: "test.com",
      detectedAt: 12345
    },
    confidence: 100,
    fingerprint: "test-fingerprint"
  };

  const dummyOffer1: RankedOffer = {
    product: dummyProduct,
    isCurrentProduct: false,
    variantState: "explicitly_matching",
    isRefurbishedOrUsed: false,
    isUnavailable: false,
    savingsValue: 100,
    savingsPercentage: 10,
    currencyMismatch: false,
    finalRankingScore: 90,
    rankingDetails: {
      finalScore: 90,
      rankingTier: "exact_identity_tier",
      explanation: "Test Explanation",
      contributions: {
        identityContribution: 50,
        qualityContribution: 10,
        marketplaceContribution: 10,
        priceAvailabilityContribution: 10,
        priceCompetitivenessContribution: 10,
        duplicatePenalty: 0
      },
      duplicatePenalty: 0,
      priceCompetitivenessScore: 100
    }
  };

  const dummyOffer2: RankedOffer = {
    product: {
      ...dummyProduct,
      fingerprint: "test-fingerprint-2"
    },
    isCurrentProduct: false,
    variantState: "explicitly_matching",
    isRefurbishedOrUsed: false,
    isUnavailable: false,
    savingsValue: 50,
    savingsPercentage: 5,
    currencyMismatch: false,
    finalRankingScore: 80
  };

  test("1. Valid RankedDealResult with multiple offers produces the same number of RecommendationCandidate objects", () => {
    const result: RankedDealResult = {
      currentProduct: dummyProduct,
      offers: [dummyOffer1, dummyOffer2],
      bestOffer: dummyOffer1,
      hasCurrencyMismatch: false
    };

    const candidates = toRecommendationCandidates(result);
    expect(candidates).toHaveLength(2);
  });

  test("2. Existing RankedOffer ranking data is preserved", () => {
    const result: RankedDealResult = {
      currentProduct: dummyProduct,
      offers: [dummyOffer1],
      bestOffer: dummyOffer1,
      hasCurrencyMismatch: false
    };

    const candidates = toRecommendationCandidates(result);
    expect(candidates[0].product).toBe(dummyOffer1.product);
    expect(candidates[0].finalRankingScore).toBe(dummyOffer1.finalRankingScore);
    expect(candidates[0].rankingDetails).toBe(dummyOffer1.rankingDetails);
    expect(candidates[0].savingsValue).toBe(dummyOffer1.savingsValue);
    expect(candidates[0].savingsPercentage).toBe(dummyOffer1.savingsPercentage);
    expect(candidates[0].variantState).toBe(dummyOffer1.variantState);
  });

  test("3. Existing ranking order is preserved", () => {
    const result: RankedDealResult = {
      currentProduct: dummyProduct,
      offers: [dummyOffer1, dummyOffer2],
      bestOffer: dummyOffer1,
      hasCurrencyMismatch: false
    };

    const candidates = toRecommendationCandidates(result);
    expect(candidates[0].product.fingerprint).toBe("test-fingerprint");
    expect(candidates[1].product.fingerprint).toBe("test-fingerprint-2");
  });

  test("4. selectionTier is mapped correctly when bestListingDetails exists", () => {
    const result: RankedDealResult = {
      currentProduct: dummyProduct,
      offers: [dummyOffer1, dummyOffer2],
      bestOffer: dummyOffer1,
      bestListingDetails: {
        selectedOffer: dummyOffer1,
        selectionTier: "exact_available",
        selectionReason: "Cheapest exact match",
        isFallbackRequired: false,
        consideredOfferCount: 2
      },
      hasCurrencyMismatch: false
    };

    const candidates = toRecommendationCandidates(result);
    expect(candidates[0].selectionTier).toBe("exact_available");
    expect(candidates[1].selectionTier).toBe(null);
  });

  test("5. Missing bestListingDetails maps selectionTier as null", () => {
    const result: RankedDealResult = {
      currentProduct: dummyProduct,
      offers: [dummyOffer1, dummyOffer2],
      bestOffer: dummyOffer1,
      hasCurrencyMismatch: false
    };

    const candidates = toRecommendationCandidates(result);
    expect(candidates[0].selectionTier).toBe(null);
    expect(candidates[1].selectionTier).toBe(null);
  });

  test("5.1 Missing bestListingDetails and missing bestOffer does not crash the adapter", () => {
    const result: RankedDealResult = {
      currentProduct: dummyProduct,
      offers: [dummyOffer1, dummyOffer2],
      bestOffer: null,
      hasCurrencyMismatch: false
    };

    const candidates = toRecommendationCandidates(result);
    expect(candidates[0].selectionTier).toBe(null);
    expect(candidates[1].selectionTier).toBe(null);
  });

  test("6. Empty offers return []", () => {
    const result: RankedDealResult = {
      currentProduct: dummyProduct,
      offers: [],
      bestOffer: null,
      hasCurrencyMismatch: false
    };

    const candidates = toRecommendationCandidates(result);
    expect(candidates).toEqual([]);
  });

  test("7. Invalid/null input is handled safely", () => {
    expect(toRecommendationCandidates(null)).toEqual([]);
    expect(toRecommendationCandidates(undefined)).toEqual([]);
  });

  test("8. No recommendation score is calculated", () => {
    const result: RankedDealResult = {
      currentProduct: dummyProduct,
      offers: [dummyOffer1],
      bestOffer: dummyOffer1,
      hasCurrencyMismatch: false
    };

    const candidates = toRecommendationCandidates(result);
    expect((candidates[0] as any).recommendationScore).toBeUndefined();
  });

  test("9. No recommendation decision is made", () => {
    const result: RankedDealResult = {
      currentProduct: dummyProduct,
      offers: [dummyOffer1],
      bestOffer: dummyOffer1,
      hasCurrencyMismatch: false
    };

    const candidates = toRecommendationCandidates(result);
    expect(Array.isArray(candidates)).toBe(true);
    expect(candidates[0].product).toBeDefined();
  });
});
