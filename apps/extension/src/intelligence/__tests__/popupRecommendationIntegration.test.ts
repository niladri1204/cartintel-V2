import { describe, test, expect } from "vitest";
import { buildRecommendationRequest } from "../intent/recommendationRequestBuilder";
import { buildExplainableRecommendation } from "../decision/decisionExplanation";
import type { RecommendationCandidate } from "../recommendationTypes";
import type { ProductIntelligence } from "../types";

describe("popupRecommendationIntegration - Phase 1.12.7.1 Recommendation Pipeline -> Popup Integration", () => {
  const currentProduct: ProductIntelligence = {
    originalTitle: "Samsung Galaxy S24 (256GB, Black)",
    originalPrice: 45000,
    originalCurrency: "INR",
    brand: "samsung",
    category: "smartphone",
    model: "Galaxy S24",
    storage: "256GB",
    confidence: 95,
    fingerprint: "samsung|galaxy s24",
    originalUrl: "https://amazon.in/samsung-s24"
  };

  const rawDiscoveredProducts: ProductIntelligence[] = [
    currentProduct,
    {
      originalTitle: "Samsung Galaxy S24 (256GB, Grey)",
      originalPrice: 43000,
      originalCurrency: "INR",
      brand: "samsung",
      category: "smartphone",
      model: "Galaxy S24",
      storage: "256GB",
      confidence: 95,
      fingerprint: "samsung|galaxy s24",
      originalUrl: "https://flipkart.com/samsung-s24"
    },
    {
      originalTitle: "Apple iPhone 15 (128GB)",
      originalPrice: 65000,
      originalCurrency: "INR",
      brand: "apple",
      category: "smartphone",
      model: "iPhone 15",
      storage: "128GB",
      confidence: 95,
      fingerprint: "apple|iphone 15",
      originalUrl: "https://amazon.in/iphone-15"
    }
  ];

  test("1. Successfully transforms raw discovered products into candidates and runs decision pipeline", () => {
    const candidates: RecommendationCandidate[] = rawDiscoveredProducts.map(p => ({
      product: p,
      isCurrentProduct: p.originalUrl === currentProduct.originalUrl,
      variantState: "explicitly_matching",
      isRefurbishedOrUsed: (p.originalTitle || "").toLowerCase().includes("refurbished"),
      isUnavailable: false,
      savingsValue: null,
      savingsPercentage: null,
      currencyMismatch: false,
      finalRankingScore: p.confidence || 80,
      priceAvailabilityScore: 80,
      identityConfidenceScore: p.confidence || 80,
      qualityScore: 80,
      marketplaceReliabilityScore: 80,
      duplicateRedundancyScore: 0
    }));

    const req = buildRecommendationRequest(
      currentProduct.normalizedTitle || currentProduct.originalTitle || "",
      candidates
    );

    const recResult = buildExplainableRecommendation(req, candidates);

    expect(recResult).toBeDefined();
    expect(recResult.recommendedCandidate).toBeDefined();
    expect(recResult.recommendationScore).toBeGreaterThan(0);
    expect(recResult.productOfferDetails).toBeDefined();
    expect(recResult.bestOffer).toBeDefined();
    expect(recResult.cheapestOffer).toBeDefined();
    expect(recResult.bestValueOffer).toBeDefined();
    expect(recResult.alternatives).toBeDefined();
  });

  test("2. Empty discovery results produce a valid safe decision recommendation state", () => {
    const candidates: RecommendationCandidate[] = [];

    const req = buildRecommendationRequest("Unknown Product", candidates);
    const recResult = buildExplainableRecommendation(req, candidates);

    expect(recResult).toBeDefined();
    expect(recResult.recommendedCandidate).toBeNull();
    expect(recResult.recommendationScore).toBe(0);
    expect(recResult.confidence).toBe("low");
    expect(recResult.reasons).toEqual([]);
    expect(recResult.alternatives).toEqual([]);
  });

  test("3. Preserves all recommendation result fields required by Popup state", () => {
    const candidates: RecommendationCandidate[] = rawDiscoveredProducts.map(p => ({
      product: p,
      isCurrentProduct: p.originalUrl === currentProduct.originalUrl,
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
    }));

    const req = buildRecommendationRequest(currentProduct.originalTitle || "", candidates);
    const result = buildExplainableRecommendation(req, candidates);

    expect(result).toHaveProperty("recommendedCandidate");
    expect(result).toHaveProperty("recommendationScore");
    expect(result).toHaveProperty("confidence");
    expect(result).toHaveProperty("reasons");
    expect(result).toHaveProperty("tradeOffs");
    expect(result).toHaveProperty("alternatives");
    expect(result).toHaveProperty("productOfferDetails");
    expect(result).toHaveProperty("bestOffer");
    expect(result).toHaveProperty("cheapestOffer");
    expect(result).toHaveProperty("bestValueOffer");
  });
});
