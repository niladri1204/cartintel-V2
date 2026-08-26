import { describe, test, expect } from "vitest";
import { buildExplainableRecommendation } from "../../decision/decisionExplanation";
import type { RecommendationRequest, RecommendationCandidate } from "../../recommendationTypes";

describe("Phase 4.6.1 — ALL AVAILABLE OFFERS Section & Contract Tests", () => {
  const candAmazon: RecommendationCandidate = {
    product: {
      originalTitle: "OnePlus 15R 256GB Black",
      normalizedTitle: "oneplus 15r 256gb black",
      originalPrice: 59999,
      originalCurrency: "INR",
      brand: "OnePlus",
      model: "15R",
      category: "Electronics",
      originalUrl: "https://amazon.in/dp/B0CSZD1S7S",
      fingerprint: "oneplus|15r",
      metadata: {
        marketplace: "Amazon",
        hostname: "amazon.in",
        detectedAt: Date.now()
      }
    },
    isCurrentProduct: false,
    variantState: "explicitly_matching",
    isRefurbishedOrUsed: false,
    isUnavailable: false,
    currencyMismatch: false,
    identityConfidenceScore: 90,
    duplicateRedundancyScore: 0,
    marketplaceReliabilityScore: 95,
    finalRankingScore: 90,
    qualityScore: 85,
    priceAvailabilityScore: 95
  };

  const candZepto: RecommendationCandidate = {
    product: {
      originalTitle: "OnePlus 15R 256GB Black",
      normalizedTitle: "oneplus 15r 256gb black",
      originalPrice: 54099,
      originalCurrency: "INR",
      brand: "OnePlus",
      model: "15R",
      category: "Electronics",
      originalUrl: "https://zepto.in/p/zepto-15r",
      fingerprint: "oneplus|15r",
      metadata: {
        marketplace: "Zepto",
        hostname: "zepto.in",
        detectedAt: Date.now()
      }
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

  const candMyGNoUrl: RecommendationCandidate = {
    product: {
      originalTitle: "OnePlus 15R 256GB Black",
      normalizedTitle: "oneplus 15r 256gb black",
      originalPrice: 54685,
      originalCurrency: "INR",
      brand: "OnePlus",
      model: "15R",
      category: "Electronics",
      originalUrl: null, // Missing original URL
      fingerprint: "oneplus|15r",
      metadata: {
        marketplace: "MyG",
        hostname: "myg.in",
        detectedAt: Date.now()
      }
    },
    isCurrentProduct: false,
    variantState: "explicitly_matching",
    isRefurbishedOrUsed: false,
    isUnavailable: false,
    currencyMismatch: false,
    identityConfidenceScore: 90,
    duplicateRedundancyScore: 0,
    marketplaceReliabilityScore: 85,
    finalRankingScore: 80,
    qualityScore: 75,
    priceAvailabilityScore: 90
  };

  const candidates = [candAmazon, candZepto, candMyGNoUrl];
  const request: RecommendationRequest = { candidates };

  // Test 1: All eligible offers render in the contract array.
  test("1. All eligible offers render in decision result contract array", () => {
    const result = buildExplainableRecommendation(request, candidates);

    expect(result.allOffers).toBeDefined();
    expect(result.allOffers).toHaveLength(3);
    expect(result.allOffers).toContain(candAmazon);
    expect(result.allOffers).toContain(candZepto);
    expect(result.allOffers).toContain(candMyGNoUrl);
  });

  // Test 2: Merchant name, price, and currency render correctly in candidate data.
  test("2. Merchant name, price, and currency render correctly", () => {
    const result = buildExplainableRecommendation(request, candidates);
    const zeptoOffer = result.allOffers?.find(c => c.product?.metadata?.marketplace === "Zepto");

    expect(zeptoOffer).toBeDefined();
    expect(zeptoOffer?.product?.metadata?.marketplace).toBe("Zepto");
    expect(zeptoOffer?.product?.originalPrice).toBe(54099);
    expect(zeptoOffer?.product?.originalCurrency).toBe("INR");
  });

  // Test 3: Original merchant URL is preserved without modification or synthesis.
  test("3. Original merchant URL is preserved", () => {
    const result = buildExplainableRecommendation(request, candidates);
    const amazonOffer = result.allOffers?.find(c => c.product?.metadata?.marketplace === "Amazon");
    const zeptoOffer = result.allOffers?.find(c => c.product?.metadata?.marketplace === "Zepto");

    expect(amazonOffer?.product?.originalUrl).toBe("https://amazon.in/dp/B0CSZD1S7S");
    expect(zeptoOffer?.product?.originalUrl).toBe("https://zepto.in/p/zepto-15r");
  });

  // Test 4: Missing URL hides the CTA safely without throwing or fabricating URLs.
  test("4. Missing URL is handled safely (null/empty originalUrl)", () => {
    const result = buildExplainableRecommendation(request, candidates);
    const myGOffer = result.allOffers?.find(c => c.product?.metadata?.marketplace === "MyG");

    expect(myGOffer).toBeDefined();
    expect(myGOffer?.product?.originalUrl).toBeNull();
  });

  // Test 5: Input/result immutability and deterministic rendering.
  test("5. Input/result immutability and deterministic rendering", () => {
    const candidatesCopy = JSON.parse(JSON.stringify(candidates));
    const result1 = buildExplainableRecommendation(request, candidates);
    const result2 = buildExplainableRecommendation(request, candidates);

    // Input candidates array remains unchanged
    expect(candidates).toEqual(candidatesCopy);

    // Output offer arrays are deterministic
    expect(result1.allOffers).toEqual(result2.allOffers);
    expect(result1.bestOffer).toEqual(result2.bestOffer);
    expect(result1.cheapestOffer).toEqual(result2.cheapestOffer);
  });
});
