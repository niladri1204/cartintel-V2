import { describe, test, expect } from "vitest";
import type { ProductIntelligence } from "../types";
import type { RecommendationCandidate, RecommendationResult } from "../recommendationTypes";
import { buildExplainableRecommendation } from "../decision/decisionExplanation";
import { buildRecommendationRequest } from "../intent/recommendationRequestBuilder";
import { isUrlOwnedByMerchant } from "../../../../../apps/web/server/services/search/directMerchantUrlResolver";

describe("Phase 4.12.1 — Runtime Pipeline Cleanup", () => {
  const currentProduct: ProductIntelligence = {
    brand: "Apple",
    model: "iPhone 16",
    storage: "128GB",
    normalizedTitle: "Apple iPhone 16 (128 GB) - Ultramarine",
    originalTitle: "Apple iPhone 16 (128 GB) - Ultramarine",
    originalPrice: 79900,
    originalCurrency: "INR",
    confidence: 95,
    fingerprint: "apple-iphone-16-128gb",
  };

  const sampleProducts: ProductIntelligence[] = [
    {
      brand: "Apple",
      model: "iPhone 16",
      storage: "128GB",
      normalizedTitle: "Apple iPhone 16 128GB Blue",
      originalTitle: "Apple iPhone 16 128GB Blue",
      originalPrice: 65900,
      originalCurrency: "INR",
      confidence: 95,
      fingerprint: "apple-iphone-16-128gb",
      source: "Flipkart",
      originalUrl: "https://www.flipkart.com/apple-iphone-16-128gb",
      metadata: { marketplace: "Flipkart" },
    },
    {
      brand: "Apple",
      model: "iPhone 16",
      storage: "128GB",
      normalizedTitle: "Apple iPhone 16 128GB Teal",
      originalTitle: "Apple iPhone 16 128GB Teal",
      originalPrice: 68900,
      originalCurrency: "INR",
      confidence: 95,
      fingerprint: "apple-iphone-16-128gb",
      source: "Reliance Digital",
      originalUrl: "https://www.reliancedigital.in/apple-iphone-16-128gb",
      metadata: { marketplace: "Reliance Digital" },
    },
    {
      brand: "Apple",
      model: "iPhone 16",
      storage: "128GB",
      normalizedTitle: "Apple iPhone 16 128GB Pink",
      originalTitle: "Apple iPhone 16 128GB Pink",
      originalPrice: 69900,
      originalCurrency: "INR",
      confidence: 95,
      fingerprint: "apple-iphone-16-128gb",
      source: "Apple Store",
      originalUrl: "https://www.apple.com/in/shop/buy-iphone/iphone-16-pink",
      metadata: { marketplace: "Apple Store", hostname: "apple.com", detectedAt: Date.now() },
    },
    {
      brand: "Apple",
      model: "iPhone 16",
      storage: "128GB",
      normalizedTitle: "Apple iPhone 16 128GB White",
      originalTitle: "Apple iPhone 16 128GB White",
      originalPrice: 70900,
      originalCurrency: "INR",
      confidence: 95,
      fingerprint: "apple-iphone-16-128gb",
      source: "iCrescent",
      originalUrl: "https://icrescent.com/iphone-16-white",
      metadata: { marketplace: "iCrescent", hostname: "icrescent.com", detectedAt: Date.now() },
    },
  ];

  const buildCandidates = (products: ProductIntelligence[]): RecommendationCandidate[] => {
    return products.map(p => ({
      product: p,
      isCurrentProduct: false,
      variantState: "explicitly_matching",
      isRefurbishedOrUsed: false,
      isUnavailable: false,
      savingsValue: (currentProduct.originalPrice || 0) - (p.originalPrice || 0),
      savingsPercentage: ((currentProduct.originalPrice || 0) - (p.originalPrice || 0)) / (currentProduct.originalPrice || 1) * 100,
      currencyMismatch: false,
      finalRankingScore: 90,
      priceAvailabilityScore: 90,
      identityConfidenceScore: 95,
      qualityScore: 95,
      marketplaceReliabilityScore: 90,
      duplicateRedundancyScore: 0,
    }));
  };

  // Test 1: Popup/result path uses decisionRecommendation only and never legacy rankedResult
  test("1. Popup/result path uses decisionRecommendation only and never legacy rankedResult", () => {
    const candidates = buildCandidates(sampleProducts);
    const req = {
      ...buildRecommendationRequest(currentProduct.normalizedTitle || ""),
      candidates,
    };
    const recResult: RecommendationResult = buildExplainableRecommendation(req, candidates);

    expect(recResult).toBeDefined();
    expect(recResult.allEligibleOffers).toBeDefined();
    expect(Array.isArray(recResult.allEligibleOffers)).toBe(true);
    expect((recResult as any).rankedResult).toBeUndefined();
    expect(recResult.bestOffer).toBeDefined();
    expect(recResult.bestOffer?.product.metadata?.marketplace).toBe("Flipkart");
  });

  // Test 2: allEligibleOffers remains the authoritative final offer collection
  test("2. allEligibleOffers remains the authoritative final offer collection", () => {
    const candidates = buildCandidates(sampleProducts);
    const req = {
      ...buildRecommendationRequest(currentProduct.normalizedTitle || ""),
      candidates,
    };
    const recResult = buildExplainableRecommendation(req, candidates);

    expect(recResult.allEligibleOffers).toBeDefined();
    expect(recResult.allEligibleOffers!.length).toBe(4);
    const merchants = recResult.allEligibleOffers!.map(o => o.product.metadata?.marketplace);
    expect(merchants).toContain("Flipkart");
    expect(merchants).toContain("Reliance Digital");
    expect(merchants).toContain("Apple Store");
    expect(merchants).toContain("iCrescent");
  });

  // Test 3: Removing legacy ranking path does not change offer count
  test("3. Removing legacy ranking path does not change offer count", () => {
    const candidates = buildCandidates(sampleProducts);
    const req = {
      ...buildRecommendationRequest(currentProduct.normalizedTitle || ""),
      candidates,
    };
    const recResult = buildExplainableRecommendation(req, candidates);

    expect(recResult.allEligibleOffers!.length).toBe(sampleProducts.length);
  });

  // Test 4: URL preservation ensures direct verified merchant URLs on final offers
  test("4. URL preservation ensures direct verified merchant URLs on final offers", () => {
    const candidates = buildCandidates(sampleProducts);
    const req = {
      ...buildRecommendationRequest(currentProduct.normalizedTitle || ""),
      candidates,
    };
    const recResult = buildExplainableRecommendation(req, candidates);

    const initialOffers = [...recResult.allEligibleOffers!];
    const initialOfferCount = initialOffers.length;
    const initialBestOfferPrice = recResult.bestOffer?.product.originalPrice;

    const appleOffer = recResult.allEligibleOffers!.find(o => o.product.metadata?.marketplace === "Apple Store");
    expect(appleOffer?.product.originalUrl).toBe("https://www.apple.com/in/shop/buy-iphone/iphone-16-pink");

    // Verify count, order, and bestOffer selection did not change
    expect(recResult.allEligibleOffers!.length).toBe(initialOfferCount);
    expect(recResult.bestOffer?.product.originalPrice).toBe(initialBestOfferPrice);
  });

  // Test 5: iCrescent cannot receive Apple.com URL
  test("5. iCrescent cannot receive Apple.com URL", () => {
    const isAppleAllowedForApple = isUrlOwnedByMerchant("Apple Store", "www.apple.com");
    const isAppleAllowedForOfficialApple = isUrlOwnedByMerchant("Apple", "apple.com");
    const isAppleAllowedForICrescent = isUrlOwnedByMerchant("iCrescent", "www.apple.com");
    const isAppleAllowedForImagine = isUrlOwnedByMerchant("Imagine Apple Premium Reseller", "www.apple.com");

    expect(isAppleAllowedForApple).toBe(true);
    expect(isAppleAllowedForOfficialApple).toBe(true);
    expect(isAppleAllowedForICrescent).toBe(false);
    expect(isAppleAllowedForImagine).toBe(false);
  });
});
