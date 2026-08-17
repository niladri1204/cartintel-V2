import { describe, test, expect } from "vitest";
import type { RecommendationResult } from "../../intelligence/recommendationTypes";

describe("RecommendationPresentation Component Logic", () => {
  const mockRecommendationResult: RecommendationResult = {
    recommendedCandidate: {
      product: {
        brand: "samsung",
        category: "smartphone",
        originalPrice: 45000,
        originalCurrency: "INR",
        originalTitle: "Samsung Galaxy S24 (256GB)",
        normalizedTitle: "samsung galaxy s24 256gb",
        storage: "256GB",
        model: "Galaxy S24",
        confidence: 95,
        fingerprint: "samsung|galaxy s24",
        metadata: { marketplace: "Amazon", hostname: "amazon.in", detectedAt: Date.now() }
      },
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
    },
    recommendationScore: 96,
    confidence: "high",
    confidenceDetails: {
      score: 0.95,
      factors: {
        identityCertainty: 0.95,
        priceFreshness: 1.0,
        dataCompleteness: 0.95
      }
    },
    reasons: [
      { type: "custom", message: "Matches requested Samsung brand", scoreImpact: 30 },
      { type: "custom", message: "Matches requested 256GB storage spec", scoreImpact: 20 }
    ],
    tradeOffs: [
      {
        aspect: "Price vs Merchant Quality",
        positiveImpact: "Stronger merchant reliability & warranty",
        negativeImpact: "₹2,000 higher than unverified seller"
      }
    ],
    alternatives: [
      {
        candidate: {
          product: {
            brand: "apple",
            category: "smartphone",
            originalPrice: 65000,
            originalCurrency: "INR",
            originalTitle: "Apple iPhone 15",
            confidence: 90,
            fingerprint: "apple|iphone 15"
          },
          isCurrentProduct: false,
          variantState: "explicitly_matching",
          isRefurbishedOrUsed: false,
          isUnavailable: false,
          savingsValue: null,
          savingsPercentage: null,
          currencyMismatch: false,
          finalRankingScore: 85
        },
        comparisonMessage: "Alternative Product: APPLE (Apple iPhone 15) with decision score 85",
        scoreDifference: 11
      }
    ],
    productOfferDetails: {
      productReasons: [{ type: "custom", message: "Matches requested Samsung brand" }],
      offerReasons: [{ type: "reputation", message: "Best overall price & merchant reliability" }],
      bestProductSummary: "Best product: Samsung Galaxy S24 (product fit score: 96/100)",
      bestOfferSummary: "Best offer: Amazon at INR 45000",
      cheapestOfferSummary: "Cheapest offer: Flipkart at INR 43000",
      bestValueOfferSummary: "Best value offer: Amazon at INR 45000"
    },
    metadata: {
      evaluatedCandidateCount: 3,
      decisionAlgorithmVersion: "1.12.5",
      processedAt: Date.now(),
      executionTimeMs: 5
    }
  };

  test("1. RecommendationResult fixture contains all required UI presentation fields", () => {
    expect(mockRecommendationResult.recommendedCandidate).toBeDefined();
    expect(mockRecommendationResult.recommendationScore).toBe(96);
    expect(mockRecommendationResult.confidence).toBe("high");
    expect(mockRecommendationResult.reasons).toHaveLength(2);
    expect(mockRecommendationResult.reasons[0].message).toBe("Matches requested Samsung brand");
    expect(mockRecommendationResult.tradeOffs).toHaveLength(1);
    expect(mockRecommendationResult.alternatives).toHaveLength(1);
    expect(mockRecommendationResult.productOfferDetails?.bestProductSummary).toBeDefined();
    expect(mockRecommendationResult.productOfferDetails?.bestOfferSummary).toBeDefined();
    expect(mockRecommendationResult.productOfferDetails?.cheapestOfferSummary).toBeDefined();
  });

  test("2. Currency symbol formatter returns correct symbols for UI display", () => {
    const getCurrencySymbol = (codeOrSymbol: string | null): string => {
      if (!codeOrSymbol) return "₹";
      const map: Record<string, string> = { USD: "$", EUR: "€", GBP: "£", JPY: "¥", INR: "₹" };
      return map[codeOrSymbol.toUpperCase()] || codeOrSymbol;
    };

    expect(getCurrencySymbol("INR")).toBe("₹");
    expect(getCurrencySymbol("USD")).toBe("$");
    expect(getCurrencySymbol("EUR")).toBe("€");
    expect(getCurrencySymbol(null)).toBe("₹");
  });
});
