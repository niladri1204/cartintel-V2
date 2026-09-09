import { describe, test, expect } from "vitest";
import { evaluateOfferLevelDecisions } from "../../decision/offerDecision";
import type { RecommendationRequest, RecommendationCandidate } from "../../recommendationTypes";
import type { ProductDecisionGroup } from "../../decision/decisionTypes";

function makeCandidate(overrides: any): RecommendationCandidate {
  const { product: prodOverrides, ...restOverrides } = overrides || {};
  return {
    isCurrentProduct: false,
    variantState: "explicitly_matching",
    isRefurbishedOrUsed: false,
    isUnavailable: false,
    currencyMismatch: false,
    identityConfidenceScore: 90,
    duplicateRedundancyScore: 0,
    marketplaceReliabilityScore: 90,
    finalRankingScore: 85,
    qualityScore: 80,
    priceAvailabilityScore: 95,
    ...restOverrides,
    product: {
      originalTitle: "OnePlus 15R",
      originalPrice: 50000,
      originalCurrency: "INR",
      originalUrl: "https://www.amazon.in/dp/B0TEST123",
      brand: "OnePlus",
      model: "15R",
      category: "Smartphones",
      fingerprint: "oneplus|15r",
      ...(prodOverrides || {})
    }
  };
}

describe("Fair Offer Selection & Best-Deal Correction Tests", () => {
  const baseGroup = {
    fingerprint: "oneplus|15r",
    offers: []
  } as any as ProductDecisionGroup;

  // Test 1: Amazon ₹59,999 vs Zepto ₹54,099. Both trusted and eligible.
  test("1. Amazon ₹59,999 vs Zepto ₹54,099", () => {
    const request: RecommendationRequest = {
      candidates: []
    };

    const candAmazon = makeCandidate({
      product: {
        originalTitle: "OnePlus 15R 12GB 256GB",
        originalPrice: 59999,
        originalCurrency: "INR",
        brand: "OnePlus",
        model: "15R",
        category: "Smartphones",
        fingerprint: "oneplus|15r"
      },
      marketplaceReliabilityScore: 95
    });

    const candZepto = makeCandidate({
      product: {
        originalTitle: "OnePlus 15R 12GB 256GB",
        originalPrice: 54099,
        originalCurrency: "INR",
        brand: "OnePlus",
        model: "15R",
        category: "Smartphones",
        fingerprint: "oneplus|15r"
      },
      marketplaceReliabilityScore: 90
    });

    const productGroup: ProductDecisionGroup = {
      ...baseGroup,
      offers: [candAmazon, candZepto]
    };

    const res = evaluateOfferLevelDecisions(request, productGroup);

    // Verify cheapestOffer and bestOffer are Zepto (since Zepto is eligible, trusted, and significantly cheaper)
    expect(res.cheapestOffer).toBe(candZepto);
    expect(res.bestOffer).toBe(candZepto);
  });

  // Test 2: Amazon ₹51,000 vs unknown seller ₹50,000.
  // Verify merchant trust can still influence the overall best-offer decision when price difference is small.
  test("2. Amazon ₹51,000 vs unknown seller ₹50,000", () => {
    const request: RecommendationRequest = {
      candidates: []
    };

    const candAmazon = makeCandidate({
      product: {
        originalTitle: "OnePlus 15R",
        originalPrice: 51000,
        originalCurrency: "INR",
        brand: "OnePlus",
        model: "15R",
        category: "Smartphones",
        fingerprint: "oneplus|15r"
      },
      marketplaceReliabilityScore: 95
    });

    const candUnknown = makeCandidate({
      product: {
        originalTitle: "OnePlus 15R",
        originalPrice: 50000,
        originalCurrency: "INR",
        brand: "OnePlus",
        model: "15R",
        category: "Smartphones",
        fingerprint: "oneplus|15r"
      },
      marketplaceReliabilityScore: 50,
      finalRankingScore: 50,
      qualityScore: 50,
      priceAvailabilityScore: 80
    });

    const productGroup: ProductDecisionGroup = {
      ...baseGroup,
      offers: [candAmazon, candUnknown]
    };

    const res = evaluateOfferLevelDecisions(request, productGroup);

    // Cheapest is the unknown seller, but bestOffer should be Amazon due to reliability advantage
    expect(res.cheapestOffer).toBe(candUnknown);
    expect(res.bestOffer).toBe(candAmazon);
  });

  // Test 3: Three trusted merchants: Amazon ₹59,999, Zepto ₹54,099, MyG ₹54,685
  test("3. Three trusted merchants: Amazon ₹59,999, Zepto ₹54,099, MyG ₹54,685", () => {
    const request: RecommendationRequest = {
      candidates: []
    };

    const candAmazon = makeCandidate({
      product: { originalPrice: 59999 },
      marketplaceReliabilityScore: 95
    });

    const candZepto = makeCandidate({
      product: { originalPrice: 54099 },
      marketplaceReliabilityScore: 90
    });

    const candMyG = makeCandidate({
      product: { originalPrice: 54685 },
      marketplaceReliabilityScore: 90
    });

    const productGroup: ProductDecisionGroup = {
      ...baseGroup,
      offers: [candAmazon, candZepto, candMyG]
    };

    const res = evaluateOfferLevelDecisions(request, productGroup);

    expect(res.cheapestOffer).toBe(candZepto);
    expect(res.bestOffer).toBe(candZepto);
  });

  // Test 4: Mixed currencies. Verify USD and INR are never directly compared.
  test("4. Mixed currencies are never directly compared", () => {
    const request: RecommendationRequest = {
      candidates: []
    };

    const candUSD = makeCandidate({
      product: { originalPrice: 700, originalCurrency: "USD" }
    });

    const candINR1 = makeCandidate({
      product: { originalPrice: 59000, originalCurrency: "INR" }
    });

    const candINR2 = makeCandidate({
      product: { originalPrice: 58000, originalCurrency: "INR" }
    });

    // INR is the majority currency (2 INR vs 1 USD)
    const productGroup: ProductDecisionGroup = {
      ...baseGroup,
      offers: [candUSD, candINR1, candINR2]
    };

    const res = evaluateOfferLevelDecisions(request, productGroup);

    // Verify it correctly selects from majority currency pool (INR) instead of raw numeric USD comparison
    expect(res.cheapestOffer).toBe(candINR2);
    expect(res.bestOffer).toBe(candINR2);
  });

  // Test 5: Hard requirement failure. Cheap incompatible candidate must not win.
  test("5. Hard requirement failure. Cheap incompatible candidate must not win.", () => {
    // Request requires model with RAM equal to 16GB
    const request: RecommendationRequest = {
      hardConstraints: [
        {
          attribute: "ram",
          operator: "equals",
          value: "16GB"
        }
      ],
      candidates: []
    };

    // Compatible but more expensive
    const candCompatible: RecommendationCandidate = {
      product: {
        originalTitle: "OnePlus 15R 16GB RAM",
        originalPrice: 45000,
        originalCurrency: "INR",
        originalUrl: "https://www.amazon.in/dp/B015R16GB",
        brand: "OnePlus",
        model: "15R",
        category: "Smartphones",
        ram: "16GB",
        fingerprint: "oneplus|15r"
      },
      isCurrentProduct: false,
      variantState: "explicitly_matching",
      isRefurbishedOrUsed: false,
      isUnavailable: false,
      currencyMismatch: false,
      identityConfidenceScore: 90,
      duplicateRedundancyScore: 0,
      marketplaceReliabilityScore: 90,
      finalRankingScore: 85,
      qualityScore: 80,
      priceAvailabilityScore: 95
    };

    // Cheaper but incompatible (8GB RAM)
    const candIncompatible: RecommendationCandidate = {
      product: {
        originalTitle: "OnePlus 15R 8GB RAM",
        originalPrice: 38000,
        originalCurrency: "INR",
        originalUrl: "https://www.flipkart.com/oneplus-15r-8gb/p/itm123",
        brand: "OnePlus",
        model: "15R",
        category: "Smartphones",
        ram: "8GB",
        fingerprint: "oneplus|15r"
      },
      isCurrentProduct: false,
      variantState: "explicitly_matching",
      isRefurbishedOrUsed: false,
      isUnavailable: false,
      currencyMismatch: false,
      identityConfidenceScore: 90,
      duplicateRedundancyScore: 0,
      marketplaceReliabilityScore: 90,
      finalRankingScore: 85,
      qualityScore: 80,
      priceAvailabilityScore: 95
    };

    const productGroup: ProductDecisionGroup = {
      ...baseGroup,
      offers: [candCompatible, candIncompatible]
    };

    const res = evaluateOfferLevelDecisions(request, productGroup);

    // Incompatible offer must NEVER win despite being cheaper
    expect(res.cheapestOffer).toBe(candCompatible);
    expect(res.bestOffer).toBe(candCompatible);
  });

  // Test 6: Determinism + immutability.
  test("6. Determinism, immutability, and request preservation", () => {
    const request: RecommendationRequest = {
      explicitRequirements: [],
      candidates: []
    };

    const cand1: RecommendationCandidate = {
      product: {
        originalTitle: "OnePlus 15R",
        originalPrice: 42000,
        originalCurrency: "INR",
        originalUrl: "https://www.amazon.in/dp/B015R42K",
        brand: "OnePlus",
        model: "15R",
        category: "Smartphones",
        fingerprint: "oneplus|15r"
      },
      isCurrentProduct: false,
      variantState: "explicitly_matching",
      isRefurbishedOrUsed: false,
      isUnavailable: false,
      currencyMismatch: false,
      identityConfidenceScore: 90,
      duplicateRedundancyScore: 0,
      marketplaceReliabilityScore: 90,
      finalRankingScore: 85,
      qualityScore: 80,
      priceAvailabilityScore: 95
    };

    const productGroup: ProductDecisionGroup = {
      ...baseGroup,
      offers: [cand1]
    };

    const requestFrozen = JSON.parse(JSON.stringify(request));
    const productGroupFrozen = JSON.parse(JSON.stringify(productGroup));

    const res1 = evaluateOfferLevelDecisions(request, productGroup);
    const res2 = evaluateOfferLevelDecisions(request, productGroup);

    // Determinism
    expect(res1).toEqual(res2);

    // Immutability
    expect(request).toEqual(requestFrozen);
    expect(productGroup).toEqual(productGroupFrozen);
  });
});
