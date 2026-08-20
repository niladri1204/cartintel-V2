import { describe, test, expect } from "vitest";
import { buildExplainableRecommendation } from "../../decision/decisionExplanation";
import { processProduct } from "../../engine";
import type { RecommendationRequest, RecommendationCandidate } from "../../recommendationTypes";

describe("Final Electronics Intelligence Validation - Phase 2.8", () => {
  const getProduct = (title: string, price: number, currency: string = "INR", overrides: any = {}) => {
    return {
      ...processProduct({
        title,
        price,
        currency,
        image: null,
        url: overrides.url || "https://www.merchant.com/buy",
        hostname: "merchant.com"
      }),
      ...overrides
    };
  };

  const getCandidate = (
    title: string,
    price: number,
    currency: string = "INR",
    overrides: Partial<RecommendationCandidate> = {},
    prodOverrides: any = {}
  ): RecommendationCandidate => {
    const product = getProduct(title, price, currency, prodOverrides);
    return {
      product,
      marketplaceReliabilityScore: 80,
      qualityScore: 80,
      priceAvailabilityScore: 80,
      finalRankingScore: 80,
      identityConfidenceScore: 90,
      isRefurbishedOrUsed: false,
      isUnavailable: false,
      currencyMismatch: false,
      ...overrides
    };
  };

  test("1. Complete smartphone scenario: multiple products, variants, merchants", () => {
    // Smartphone products: S24 (16GB RAM, 512GB Storage) vs S24 (8GB RAM, 128GB Storage) vs iPhone 15
    const s24High = getCandidate("Samsung Galaxy S24 (16GB RAM, 512GB Storage, Black)", 50000, "INR", {
      marketplaceReliabilityScore: 90
    });
    const s24Low = getCandidate("Samsung Galaxy S24 (8GB RAM, 128GB Storage, Silver)", 40000, "INR", {
      marketplaceReliabilityScore: 85
    });
    const iPhone = getCandidate("Apple iPhone 15 (128GB)", 60000, "INR", {
      marketplaceReliabilityScore: 90
    });

    const request: RecommendationRequest = {
      explicitRequirements: [
        { attribute: "ram", value: "16GB", operator: "greater_than_or_equal" }
      ]
    };

    const res = buildExplainableRecommendation(request, [s24High, s24Low, iPhone]);
    expect(res.recommendedCandidate?.product?.model?.toLowerCase()).toBe("galaxy s24");
    expect(res.recommendedCandidate?.product?.ram).toBe("16GB");
  });

  test("2. Complete laptop scenario: CPU/GPU/RAM/storage requirements and multiple offers", () => {
    // Laptops: RTX 4070 (eligible) vs GTX 1650 (ineligible)
    const laptop1 = getCandidate("Asus ROG Strix | NVIDIA GeForce RTX 4070 GPU | 16GB RAM | 512GB SSD", 120000);
    const laptop2 = getCandidate("Asus ROG Strix | GTX 1650 | 8GB RAM | 256GB SSD", 80000);

    const request: RecommendationRequest = {
      explicitRequirements: [
        { attribute: "gpu", value: "RTX 4070", operator: "equals" },
        { attribute: "ram", value: "16GB", operator: "greater_than_or_equal" }
      ]
    };

    const res = buildExplainableRecommendation(request, [laptop1, laptop2]);
    expect(res.recommendedCandidate).toBe(laptop1);
    expect(res.recommendedCandidate?.product?.gpu).toBe("NVIDIA GeForce RTX 4070");
  });

  test("3. Complete monitor scenario: resolution/refresh-rate/panel requirements", () => {
    // Monitors: 4K OLED (eligible) vs FHD IPS (ineligible)
    const monitor1 = getCandidate("LG 27 inch 4K UHD OLED 144Hz Gaming Monitor", 70000);
    const monitor2 = getCandidate("LG 27 inch FHD IPS 60Hz Office Monitor", 15000);

    const request: RecommendationRequest = {
      explicitRequirements: [
        { attribute: "resolution", value: "4K UHD", operator: "equals" },
        { attribute: "displayTechnology", value: "OLED", operator: "equals" },
        { attribute: "refreshRate", value: "120Hz", operator: "greater_than_or_equal" }
      ]
    };

    const res = buildExplainableRecommendation(request, [monitor1, monitor2]);
    expect(res.recommendedCandidate).toBe(monitor1);
    expect(res.recommendedCandidate?.product?.resolution).toBe("4K");
  });

  test("4. Deep specification propagation: extracted specs survive decision pipeline", () => {
    const candidate = getCandidate("Samsung S24 (16GB RAM, 512GB Storage, 120Hz OLED, 5000mAh, 45W charging)", 45000);
    const request: RecommendationRequest = {};

    const res = buildExplainableRecommendation(request, [candidate]);
    const prod = res.recommendedCandidate?.product;
    expect(prod?.ram).toBe("16GB");
    expect(prod?.storage).toBe("512GB");
    expect(prod?.refreshRate).toBe("120Hz");
    expect(prod?.displayTechnology).toBe("OLED");
    expect(prod?.batteryCapacity).toBe("5000mAh");
    expect(prod?.chargingCapability).toBe("45W");
  });

  test("5. Variant separation: different RAM/storage must not collapse incorrectly", () => {
    const p1 = getCandidate("Samsung S24 (16GB RAM, 512GB Storage)", 50000);
    const p2 = getCandidate("Samsung S24 (8GB RAM, 128GB Storage)", 40000);

    expect(p1.product?.fingerprint).not.toBe(p2.product?.fingerprint);
  });

  test("6. Requirement correctness: explicit hard requirements eliminate incompatible products", () => {
    const p1 = getCandidate("Samsung S24 (8GB RAM)", 35000);
    const p2 = getCandidate("Samsung S24 (16GB RAM)", 45000);

    const request: RecommendationRequest = {
      explicitRequirements: [
        { attribute: "ram", value: "16GB", operator: "greater_than_or_equal", isMandatory: true }
      ]
    };

    const res = buildExplainableRecommendation(request, [p1, p2]);
    expect(res.recommendedCandidate).toBe(p2);
  });

  test("7. Product price independence: cheaper seller offers must not cause inferior product to win selection", () => {
    const p1 = getCandidate("Apple iPhone 15", 60000); // User loyalty target
    const p2 = getCandidate("Samsung S24", 30000); // Cheaper, but not preferred

    const request: RecommendationRequest = {
      userPreferences: [
        { key: "brand_loyalty", value: "apple" }
      ]
    };

    const res = buildExplainableRecommendation(request, [p1, p2]);
    expect(res.recommendedCandidate?.product?.brand).toBe("apple");
  });

  test("8. Offer differentiation: bestOffer, cheapestOffer, bestValueOffer separation", () => {
    const p1 = getCandidate("Samsung Galaxy S24", 45000, "INR", {
      marketplaceReliabilityScore: 95,
      qualityScore: 95,
      finalRankingScore: 95
    }); // Best value
    const p2 = getCandidate("Samsung Galaxy S24", 39000, "INR", {
      marketplaceReliabilityScore: 30, // cheap but unreliable
      qualityScore: 50,
      finalRankingScore: 50
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

  test("9. Value intelligence: slightly pricier but higher quality beats cheap inadequate offer", () => {
    const p1 = getCandidate("Samsung Galaxy S24 (16GB RAM, 512GB)", 45000, "INR", {
      marketplaceReliabilityScore: 90,
      qualityScore: 90,
      finalRankingScore: 90
    }); // Satisfies RAM requirement
    const p2 = getCandidate("Samsung Galaxy S24 (8GB RAM, 128GB)", 39000, "INR", {
      marketplaceReliabilityScore: 90,
      qualityScore: 90,
      finalRankingScore: 90
    }); // Cheaper but fails requirement

    const request: RecommendationRequest = {
      explicitRequirements: [
        { attribute: "ram", value: "16GB", operator: "greater_than_or_equal", isMandatory: true }
      ]
    };

    const res = buildExplainableRecommendation(request, [p1, p2]);
    expect(res.bestValueOffer).toBe(p1);
  });

  test("10. Missing-data and currency safety: missing specification, prices, and currencies remain safe", () => {
    // Missing specs or price must downgrade confidence and not create recommendations
    const p1 = getCandidate("Samsung Galaxy S24", 0, "INR", {
      identityConfidenceScore: 20
    });
    p1.product!.originalPrice = null;
    p1.product!.brand = null;
    p1.product!.model = null;

    const request: RecommendationRequest = {};

    const res = buildExplainableRecommendation(request, [p1]);
    expect(res.confidence).toBe("low");
  });

  test("11. Explanation + alternatives validation", () => {
    const p1 = getCandidate("Apple iPhone 15", 60000);
    const p2 = getCandidate("Samsung Galaxy S24", 45000);

    const request: RecommendationRequest = {
      userPreferences: [
        { key: "brand_loyalty", value: "apple" }
      ]
    };

    const res = buildExplainableRecommendation(request, [p1, p2]);
    expect(res.productOfferDetails?.bestProductSummary?.toLowerCase()).toContain("apple");
    expect(res.alternatives.length).toBeGreaterThan(0);
    expect(res.alternatives[0].candidate.product?.brand).toBe("samsung");
  });

  test("12. Determinism + immutability validation", () => {
    const p1 = getCandidate("Samsung Galaxy S24 (16GB RAM)", 45000);
    const p2 = getCandidate("Samsung Galaxy S24 (8GB RAM)", 40000);

    const request: RecommendationRequest = {};

    const reqCopy = JSON.parse(JSON.stringify(request));
    const candCopy1 = JSON.parse(JSON.stringify(p1));

    const res1 = buildExplainableRecommendation(request, [p1, p2]);
    const res2 = buildExplainableRecommendation(request, [p1, p2]);

    // Determinism
    expect(res1.recommendedCandidate).toBe(res2.recommendedCandidate);

    // Immutability
    expect(request).toEqual(reqCopy);
    expect(p1).toEqual(candCopy1);
  });

  test("13. Purchase Safety: preserve offer URL exactly", () => {
    const originalUrl = "https://www.amazon.in/dp/B0CSFYN9Y2/ref=s24_buy";
    const candidate = getCandidate("Samsung Galaxy S24", 45000, "INR", {}, { url: originalUrl });

    const request: RecommendationRequest = {};

    const res = buildExplainableRecommendation(request, [candidate]);
    expect(res.recommendedCandidate?.product?.originalUrl).toBe(originalUrl);
  });
});
