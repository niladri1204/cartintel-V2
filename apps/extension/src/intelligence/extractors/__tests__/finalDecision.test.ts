import { describe, test, expect } from "vitest";
import { buildExplainableRecommendation } from "../../decision/decisionExplanation";
import { processProduct } from "../../engine";
import type { RecommendationRequest, RecommendationCandidate } from "../../recommendationTypes";

describe("Final Electronics Buying Decision - Phase 2.7", () => {
  const getProduct = (title: string, price: number, currency: string = "INR") => {
    return processProduct({
      title,
      price,
      currency,
      image: null,
      url: "https://www.amazon.in/dp/123",
      hostname: "amazon.in"
    });
  };

  const getCandidate = (
    title: string,
    price: number,
    currency: string = "INR",
    overrides: Partial<RecommendationCandidate> = {}
  ): RecommendationCandidate => {
    const product = getProduct(title, price, currency);
    return {
      product,
      marketplaceReliabilityScore: 80,
      qualityScore: 80,
      priceAvailabilityScore: 80,
      finalRankingScore: 80,
      identityConfidenceScore: 90,
      ...overrides
    };
  };

  test("1. Correct canonical product selected from multiple electronics products", () => {
    // Samsung Galaxy S24 fits the requirement, iPhone 15 does not fit RAM requirement
    const p1 = getCandidate("Samsung Galaxy S24 (16GB RAM, 512GB Storage)", 45000);
    const p2 = getCandidate("Apple iPhone 15 (8GB RAM, 128GB Storage)", 43000);

    const request: RecommendationRequest = {
      explicitRequirements: [
        { attribute: "ram", value: "16GB", operator: "greater_than_or_equal" }
      ]
    };

    const res = buildExplainableRecommendation(request, [p1, p2]);
    expect(res.recommendedCandidate?.product?.model?.toLowerCase()).toBe("galaxy s24");
    expect(res.productOfferDetails?.bestProductSummary?.toLowerCase()).toContain("samsung");
  });

  test("2. Hard requirement eliminates incompatible product", () => {
    const p1 = getCandidate("Samsung Galaxy S24 (8GB RAM)", 38000); // fails mandatory RAM requirement
    const p2 = getCandidate("Samsung Galaxy S24 (16GB RAM)", 45000); // passes mandatory RAM requirement

    const request: RecommendationRequest = {
      explicitRequirements: [
        { attribute: "ram", value: "16GB", operator: "greater_than_or_equal", isMandatory: true }
      ]
    };

    const res = buildExplainableRecommendation(request, [p1, p2]);
    expect(res.recommendedCandidate?.product?.ram).toBe("16GB");
  });

  test("3. Product selection remains independent of seller price", () => {
    // iPhone 15 fits the user preference but is more expensive. S24 is cheap.
    // The canonical product selection should choose iPhone 15 based on brand loyalty preference.
    const p1 = getCandidate("Apple iPhone 15 (128GB)", 60000);
    const p2 = getCandidate("Samsung Galaxy S24 (128GB)", 35000);

    const request: RecommendationRequest = {
      userPreferences: [
        { key: "brand_loyalty", value: "apple" }
      ]
    };

    const res = buildExplainableRecommendation(request, [p1, p2]);
    expect(res.recommendedCandidate?.product?.brand).toBe("apple");
  });

  test("4. Best offer vs cheapest offer distinction", () => {
    // Two offers of same product: A is cheaper but unreliable. B is slightly pricier but highly reliable.
    const p1 = getCandidate("Samsung Galaxy S24", 45000, "INR", {
      marketplaceReliabilityScore: 95,
      qualityScore: 95
    });
    const p2 = getCandidate("Samsung Galaxy S24", 40000, "INR", {
      marketplaceReliabilityScore: 30, // unreliable
      qualityScore: 50
    });

    const request: RecommendationRequest = {};

    const res = buildExplainableRecommendation(request, [p1, p2]);
    expect(res.bestOffer).toBe(p1);
    expect(res.cheapestOffer).toBe(p2);
  });

  test("5. Best-value offer differs from cheapest offer", () => {
    // Three offers: A is very cheap but very poor quality. B is moderate price, excellent quality. C is high price.
    const p1 = getCandidate("Samsung Galaxy S24", 43000, "INR", {
      marketplaceReliabilityScore: 95,
      qualityScore: 95,
      finalRankingScore: 95
    }); // Best value
    const p2 = getCandidate("Samsung Galaxy S24", 39000, "INR", {
      marketplaceReliabilityScore: 40,
      qualityScore: 40,
      finalRankingScore: 40
    }); // Cheapest
    const p3 = getCandidate("Samsung Galaxy S24", 48000, "INR", {
      marketplaceReliabilityScore: 95,
      qualityScore: 95,
      finalRankingScore: 95
    });

    const request: RecommendationRequest = {};

    const res = buildExplainableRecommendation(request, [p1, p2, p3]);
    expect(res.bestValueOffer).toBe(p1);
    expect(res.cheapestOffer).toBe(p2);
  });

  test("6. Missing specification/price safety", () => {
    const p1 = getCandidate("Samsung Galaxy S24", 0, "INR", {
      identityConfidenceScore: 20
    });
    p1.product!.originalPrice = null;
    p1.product!.brand = null;
    p1.product!.model = null;
    p1.product!.category = null;

    const request: RecommendationRequest = {};

    const res = buildExplainableRecommendation(request, [p1]);
    expect(res.confidence).toBe("low");
  });

  test("7. Product-vs-offer separation and alternative distinction", () => {
    // iPhone 15 and Galaxy S24 are different canonical products.
    // S24 should appear as alternative product, not alternative offer.
    const p1 = getCandidate("Apple iPhone 15", 60000);
    const p2 = getCandidate("Samsung Galaxy S24", 45000);

    const request: RecommendationRequest = {
      userPreferences: [
        { key: "brand_loyalty", value: "apple" }
      ]
    };

    const res = buildExplainableRecommendation(request, [p1, p2]);
    expect(res.recommendedCandidate?.product?.brand).toBe("apple");
    expect(res.alternatives.length).toBeGreaterThan(0);
    expect(res.alternatives[0].candidate.product?.brand).toBe("samsung");
  });

  test("8. Complete laptop scenario + determinism/immutability", () => {
    const p1 = getCandidate("Asus ROG Strix | RTX 4070 | 16GB RAM | 512GB SSD", 120000);
    const p2 = getCandidate("Asus ROG Strix | RTX 4080 | 32GB RAM | 1TB SSD", 150000);

    const request: RecommendationRequest = {
      explicitRequirements: [
        { attribute: "ram", value: "32GB", operator: "greater_than_or_equal" },
        { attribute: "storage", value: "1TB", operator: "greater_than_or_equal" }
      ]
    };

    const reqCopy = JSON.parse(JSON.stringify(request));
    const candCopy1 = JSON.parse(JSON.stringify(p1));

    const res1 = buildExplainableRecommendation(request, [p1, p2]);
    const res2 = buildExplainableRecommendation(request, [p1, p2]);

    // Determinism
    expect(res1.recommendedCandidate?.product?.ram).toBe("32GB");
    expect(res1.recommendedCandidate).toBe(res2.recommendedCandidate);

    // Immutability
    expect(request).toEqual(reqCopy);
    expect(p1).toEqual(candCopy1);
  });
});
