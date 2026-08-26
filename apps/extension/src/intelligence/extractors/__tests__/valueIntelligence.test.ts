import { describe, test, expect } from "vitest";
import { evaluateElectronicsOfferValue } from "../../valueIntelligence";
import { processProduct } from "../../engine";
import type { RecommendationRequest, RecommendationCandidate } from "../../recommendationTypes";

describe("Value-for-Money Intelligence - Phase 2.6", () => {
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

  const getCandidate = (title: string, price: number, currency: string = "INR", overrides: Partial<RecommendationCandidate> = {}): RecommendationCandidate => {
    const product = getProduct(title, price, currency);
    return {
      product,
      isCurrentProduct: false,
      isRefurbishedOrUsed: false,
      isUnavailable: false,
      currencyMismatch: false,
      marketplaceReliabilityScore: 80,
      qualityScore: 80,
      priceAvailabilityScore: 80,
      finalRankingScore: 80,
      ...overrides
    };
  };

  test("1. Cheaper product is not automatically better value", () => {
    // p1 has better specs and satisfies requirement, p2 is cheaper but has lower specs
    const p1 = getCandidate("Samsung Galaxy S24 (16GB RAM, 512GB Storage)", 45000);
    const p2 = getCandidate("Samsung Galaxy S24 (8GB RAM, 128GB Storage)", 40000);

    const request: RecommendationRequest = {
      explicitRequirements: [
        { attribute: "ram", value: "16GB", operator: "greater_than_or_equal" }
      ]
    };

    const fit1 = evaluateElectronicsOfferValue(p1, request, [p1, p2], 80, 80);
    const fit2 = evaluateElectronicsOfferValue(p2, request, [p1, p2], 80, 100);

    // p1 should have higher value rating / overallValueScore
    expect(fit1.overallValueScore).toBeGreaterThan(fit2.overallValueScore);
    expect(fit1.rating).toBe("strong_value");
    expect(fit2.rating).toBe("weak_value"); // because it doesn't meet the requirement
  });

  test("2. Requirement-fit advantage beats a small price advantage", () => {
    const p1 = getCandidate("Samsung S24 16GB RAM", 41000);
    const p2 = getCandidate("Samsung S24 8GB RAM", 40000);

    const request: RecommendationRequest = {
      explicitRequirements: [
        { attribute: "ram", value: "16GB", operator: "greater_than_or_equal" }
      ]
    };

    const fit1 = evaluateElectronicsOfferValue(p1, request, [p1, p2], 85, 95);
    const fit2 = evaluateElectronicsOfferValue(p2, request, [p1, p2], 85, 100);

    expect(fit1.overallValueScore).toBeGreaterThan(fit2.overallValueScore);
  });

  test("3. Strong specification value at a reasonable price", () => {
    // Compare Product A (16GB RAM, 1TB Storage) vs Product B (8GB RAM, 512GB Storage)
    const p1 = getCandidate("Samsung S24 16GB RAM 1TB Storage", 50000);
    const p2 = getCandidate("Samsung S24 8GB RAM 512GB Storage", 48000);

    const request: RecommendationRequest = {
      productContext: {
        currentProduct: p2.product
      }
    };

    // p1 has 2 spec advantages (RAM + Storage) and only costs slightly more
    const fit1 = evaluateElectronicsOfferValue(p1, request, [p1, p2], 80, 90);
    const fit2 = evaluateElectronicsOfferValue(p2, request, [p1, p2], 80, 100);

    expect(fit1.specAdvantageScore).toBe(2);
    expect(fit1.overallValueScore).toBeGreaterThan(fit2.overallValueScore);
    expect(fit1.rating).toBe("strong_value");
  });

  test("4. Best-value offer differs from cheapest offer", () => {
    const p1 = getCandidate("Samsung S24 16GB RAM 512GB Storage", 45000);
    const p2 = getCandidate("Samsung S24 8GB RAM 128GB Storage", 40000); // cheapest

    const request: RecommendationRequest = {
      explicitRequirements: [
        { attribute: "ram", value: "16GB", operator: "greater_than_or_equal" }
      ]
    };

    const fit1 = evaluateElectronicsOfferValue(p1, request, [p1, p2], 80, 80);
    const fit2 = evaluateElectronicsOfferValue(p2, request, [p1, p2], 80, 100);

    expect(fit1.overallValueScore).toBeGreaterThan(fit2.overallValueScore);
  });

  test("5. Hard-constraint violation prevents strong value", () => {
    const p1 = getCandidate("Refurbished Samsung S24", 30000, "INR", { isRefurbishedOrUsed: true });

    const request: RecommendationRequest = {
      hardConstraints: [
        { attribute: "condition", operator: "equals", value: "New" }
      ]
    };

    const fit = evaluateElectronicsOfferValue(p1, request, [p1], 90, 100);
    expect(fit.rating).toBe("weak_value");
    expect(fit.overallValueScore).toBe(0);
  });

  test("6. Missing specification/price evidence produces insufficient evidence", () => {
    const p1 = getCandidate("Samsung S24", 0); // missing price
    p1.product!.originalPrice = null;

    const request: RecommendationRequest = {};

    const fit = evaluateElectronicsOfferValue(p1, request, [p1], 80, 80);
    expect(fit.rating).toBe("insufficient_evidence");
    expect(fit.explanation).toContain("missing price");
  });

  test("7. Mixed-currency safety", () => {
    const p1 = getCandidate("Samsung S24", 500, "USD");
    const p2 = getCandidate("Samsung S24", 45000, "INR");

    const request: RecommendationRequest = {
      productContext: {
        currentProduct: p2.product // INR reference product
      }
    };

    const fit = evaluateElectronicsOfferValue(p1, request, [p1, p2], 80, 80);
    expect(fit.rating).toBe("insufficient_evidence");
    expect(fit.explanation).toContain("currency mismatch");
  });

  test("8. Determinism and input immutability", () => {
    const p1 = getCandidate("Samsung S24 16GB RAM", 45000);
    const p2 = getCandidate("Samsung S24 8GB RAM", 40000);

    const request: RecommendationRequest = {};

    const copyRequest = JSON.parse(JSON.stringify(request));
    const copyP1 = JSON.parse(JSON.stringify(p1));

    const fit1 = evaluateElectronicsOfferValue(p1, request, [p1, p2], 80, 80);
    const fit2 = evaluateElectronicsOfferValue(p1, request, [p1, p2], 80, 80);

    // Determinism
    expect(fit1).toEqual(fit2);

    // Immutability
    expect(request).toEqual(copyRequest);
    expect(p1).toEqual(copyP1);
  });
});
