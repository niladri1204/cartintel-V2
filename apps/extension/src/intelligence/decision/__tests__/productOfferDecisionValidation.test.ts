import { describe, test, expect } from "vitest";
import { evaluateProductLevelDecisions } from "../productDecision";
import { evaluateOfferLevelDecisions } from "../offerDecision";
import { buildRecommendationRequest } from "../../intent/recommendationRequestBuilder";
import type { RecommendationCandidate, RecommendationRequest } from "../../recommendationTypes";

describe("productOfferDecisionValidation - Phase 1.12.4.3 Product–Offer Decision Validation", () => {
  // Candidate pool for Samsung Galaxy S24 (3 offers)
  const candidateS24CheapUnreliable: RecommendationCandidate = {
    product: {
      brand: "samsung",
      category: "smartphone",
      originalPrice: 35000,
      originalCurrency: "INR",
      originalTitle: "Samsung Galaxy S24 (256GB)",
      normalizedTitle: "samsung galaxy s24 256gb",
      storage: "256GB",
      model: "Galaxy S24",
      confidence: 90,
      fingerprint: "samsung|galaxy s24",
      metadata: { marketplace: "DiscountCell", hostname: "discountcell.in", detectedAt: Date.now() }
    },
    isRefurbishedOrUsed: false,
    finalRankingScore: 50,
    priceAvailabilityScore: 50,
    identityConfidenceScore: 90,
    qualityScore: 50,
    marketplaceReliabilityScore: 40,
    duplicateRedundancyScore: 0,
    isCurrentProduct: false,
    isUnavailable: false,
    currencyMismatch: false
  };

  const candidateS24MidValue: RecommendationCandidate = {
    product: {
      brand: "samsung",
      category: "smartphone",
      originalPrice: 40000,
      originalCurrency: "INR",
      originalTitle: "Samsung Galaxy S24 (256GB, Black)",
      normalizedTitle: "samsung galaxy s24 256gb black",
      storage: "256GB",
      model: "Galaxy S24",
      confidence: 95,
      fingerprint: "samsung|galaxy s24",
      metadata: { marketplace: "Flipkart", hostname: "flipkart.com", detectedAt: Date.now() }
    },
    isRefurbishedOrUsed: false,
    finalRankingScore: 95,
    priceAvailabilityScore: 90,
    identityConfidenceScore: 95,
    qualityScore: 95,
    marketplaceReliabilityScore: 95,
    duplicateRedundancyScore: 0,
    isCurrentProduct: false,
    isUnavailable: false,
    currencyMismatch: false
  };

  const candidateS24PremiumBest: RecommendationCandidate = {
    product: {
      brand: "samsung",
      category: "smartphone",
      originalPrice: 42000,
      originalCurrency: "INR",
      originalTitle: "Samsung Galaxy S24 (256GB, Official Warranty)",
      normalizedTitle: "samsung galaxy s24 256gb official warranty",
      storage: "256GB",
      model: "Galaxy S24",
      confidence: 98,
      fingerprint: "samsung|galaxy s24",
      metadata: { marketplace: "Amazon", hostname: "amazon.in", detectedAt: Date.now() }
    },
    isRefurbishedOrUsed: false,
    finalRankingScore: 100,
    priceAvailabilityScore: 100,
    identityConfidenceScore: 98,
    qualityScore: 100,
    marketplaceReliabilityScore: 100,
    duplicateRedundancyScore: 0,
    isCurrentProduct: false,
    isUnavailable: false,
    currencyMismatch: false
  };

  // Candidate for Apple iPhone 15 (1 offer)
  const candidateIPhone15: RecommendationCandidate = {
    product: {
      brand: "apple",
      category: "smartphone",
      originalPrice: 65000,
      originalCurrency: "INR",
      originalTitle: "Apple iPhone 15 (128GB)",
      normalizedTitle: "apple iphone 15 128gb",
      storage: "128GB",
      model: "iPhone 15",
      confidence: 95,
      fingerprint: "apple|iphone 15",
      metadata: { marketplace: "Amazon", hostname: "amazon.in", detectedAt: Date.now() }
    },
    isRefurbishedOrUsed: false,
    finalRankingScore: 95,
    priceAvailabilityScore: 95,
    identityConfidenceScore: 95,
    qualityScore: 95,
    marketplaceReliabilityScore: 95,
    duplicateRedundancyScore: 0,
    isCurrentProduct: false,
    isUnavailable: false,
    currencyMismatch: false
  };

  test("1. End-to-end flow: query -> Request -> Product Decision -> Offer Decision", () => {
    const rawQuery = "Samsung Galaxy S24 with 256GB storage";
    const request = buildRecommendationRequest(rawQuery);
    const candidates = [candidateS24CheapUnreliable, candidateS24MidValue, candidateS24PremiumBest, candidateIPhone15];

    // Step 1: Product Decision
    const productResult = evaluateProductLevelDecisions(request, candidates);
    expect(productResult.bestProductGroup).toBeDefined();
    expect(productResult.bestProductGroup?.fingerprint).toBe("samsung|galaxy s24");

    // Step 2: Offer Decision
    const offerResult = evaluateOfferLevelDecisions(request, productResult.bestProductGroup, candidates);
    expect(offerResult.bestOffer).toBeDefined();
    expect(offerResult.cheapestOffer).toBeDefined();
    expect(offerResult.bestValueOffer).toBeDefined();
  });

  test("2. Product fit is independent of seller price", () => {
    const expensiveS24: RecommendationCandidate = {
      ...candidateS24PremiumBest,
      product: { ...candidateS24PremiumBest.product!, originalPrice: 150000 }
    };

    const resNormal = evaluateProductLevelDecisions(null, [candidateS24PremiumBest]);
    const resExpensive = evaluateProductLevelDecisions(null, [expensiveS24]);

    expect(resNormal.bestProductGroup?.productFitScore).toBe(resExpensive.bestProductGroup?.productFitScore);
  });

  test("3. Offer selection occurs ONLY within selected canonical product group", () => {
    const request = buildRecommendationRequest("Samsung Galaxy S24");
    const candidates = [candidateS24CheapUnreliable, candidateS24MidValue, candidateS24PremiumBest, candidateIPhone15];

    const productResult = evaluateProductLevelDecisions(request, candidates);
    const offerResult = evaluateOfferLevelDecisions(request, productResult.bestProductGroup, candidates);

    // Selected offers MUST belong to the selected product fingerprint
    expect(offerResult.bestOffer?.product?.fingerprint).toBe(productResult.bestProductGroup?.fingerprint);
    expect(offerResult.cheapestOffer?.product?.fingerprint).toBe(productResult.bestProductGroup?.fingerprint);
    expect(offerResult.bestValueOffer?.product?.fingerprint).toBe(productResult.bestProductGroup?.fingerprint);
    expect(offerResult.bestOffer).not.toBe(candidateIPhone15);
  });

  test("4. Best offer, cheapest offer, and best value offer are distinct concepts and can be 3 different listings", () => {
    const candidates = [candidateS24CheapUnreliable, candidateS24MidValue, candidateS24PremiumBest];
    const productResult = evaluateProductLevelDecisions(null, candidates);
    const offerResult = evaluateOfferLevelDecisions(null, productResult.bestProductGroup, candidates);

    expect(offerResult.cheapestOffer).toBe(candidateS24CheapUnreliable);
    expect(offerResult.bestValueOffer).toBe(candidateS24MidValue);
    expect(offerResult.bestOffer).toBe(candidateS24PremiumBest);

    // Verify all 3 selections are distinct candidates
    expect(offerResult.cheapestOffer).not.toBe(offerResult.bestValueOffer);
    expect(offerResult.bestValueOffer).not.toBe(offerResult.bestOffer);
    expect(offerResult.cheapestOffer).not.toBe(offerResult.bestOffer);
  });

  test("5. Hard constraints at product level: Product with 0 eligible offers cannot be selected", () => {
    const request: RecommendationRequest = {
      hardConstraints: [{ attribute: "brand", operator: "equals", value: "samsung" }],
      candidates: [candidateIPhone15]
    };

    const productResult = evaluateProductLevelDecisions(request);
    expect(productResult.bestProductGroup).toBeNull();
  });

  test("6. Hard constraints at offer level: Ineligible offer cannot become best, cheapest, or value offer", () => {
    const ineligibleCheapS24: RecommendationCandidate = {
      ...candidateS24CheapUnreliable,
      product: { ...candidateS24CheapUnreliable.product!, brand: "non_samsung" }
    };
    const request: RecommendationRequest = {
      hardConstraints: [{ attribute: "brand", operator: "equals", value: "samsung" }]
    };
    const candidates = [ineligibleCheapS24, candidateS24PremiumBest];

    const productResult = evaluateProductLevelDecisions(request, candidates);
    const offerResult = evaluateOfferLevelDecisions(request, productResult.bestProductGroup, candidates);

    expect(offerResult.cheapestOffer).toBe(candidateS24PremiumBest);
    expect(offerResult.bestOffer).toBe(candidateS24PremiumBest);
    expect(offerResult.bestValueOffer).toBe(candidateS24PremiumBest);
  });

  test("7. Multi-product, multi-marketplace, multi-offer scenarios", () => {
    const candidates = [
      candidateS24CheapUnreliable,
      candidateS24MidValue,
      candidateS24PremiumBest,
      candidateIPhone15
    ];

    const productResult = evaluateProductLevelDecisions(null, candidates);
    expect(productResult.productGroups.length).toBe(2);

    const offerResult = evaluateOfferLevelDecisions(null, productResult.bestProductGroup, candidates);
    expect(offerResult.evaluatedOfferCount).toBe(3);
  });

  test("8. Mixed-currency safety (no arbitrary conversions)", () => {
    const candidateUSD: RecommendationCandidate = {
      ...candidateS24PremiumBest,
      product: { ...candidateS24PremiumBest.product!, originalCurrency: "USD", originalPrice: 500 }
    };

    const productResult = evaluateProductLevelDecisions(null, [candidateS24PremiumBest, candidateUSD]);
    expect(productResult.productGroups[0].currency).toBeNull(); // Currency set to null due to mismatch

    const offerResult = evaluateOfferLevelDecisions(null, productResult.bestProductGroup, [candidateS24PremiumBest, candidateUSD]);
    expect(offerResult.bestOffer).toBeDefined();
  });

  test("9. Missing price, merchant, availability, quality, and identity data handling", () => {
    const candidateSparse: RecommendationCandidate = {
      product: {
        brand: "samsung",
        category: "smartphone",
        originalPrice: null,
        originalCurrency: null,
        originalTitle: null,
        normalizedTitle: null,
        storage: null,
        ram: null,
        model: null,
        confidence: 0,
        fingerprint: "samsung|sparse",
        metadata: { marketplace: "Unknown", hostname: "", detectedAt: Date.now() }
      },
      isRefurbishedOrUsed: false,
      finalRankingScore: 0,
      priceAvailabilityScore: 0,
      identityConfidenceScore: 0,
      qualityScore: 0,
      marketplaceReliabilityScore: 0,
      duplicateRedundancyScore: 0,
      isCurrentProduct: false,
      isUnavailable: false,
      currencyMismatch: false
    };

    const productResult = evaluateProductLevelDecisions(null, [candidateSparse]);
    expect(productResult.bestProductGroup).toBeDefined();

    const offerResult = evaluateOfferLevelDecisions(null, productResult.bestProductGroup, [candidateSparse]);
    expect(offerResult.bestOffer).toBe(candidateSparse);
  });

  test("10. Deterministic tie-breaking across repeated runs", () => {
    const candidates = [candidateS24CheapUnreliable, candidateS24MidValue, candidateS24PremiumBest];
    const p1 = evaluateProductLevelDecisions(null, candidates);
    const o1 = evaluateOfferLevelDecisions(null, p1.bestProductGroup, candidates);

    const p2 = evaluateProductLevelDecisions(null, candidates);
    const o2 = evaluateOfferLevelDecisions(null, p2.bestProductGroup, candidates);

    expect(p1.bestProductGroup?.fingerprint).toBe(p2.bestProductGroup?.fingerprint);
    expect(o1.bestOffer).toBe(o2.bestOffer);
    expect(o1.cheapestOffer).toBe(o2.cheapestOffer);
    expect(o1.bestValueOffer).toBe(o2.bestValueOffer);
  });

  test("11. Object immutability (candidates, product groups, requests)", () => {
    const req = buildRecommendationRequest("Samsung phone");
    const reqCopy = JSON.parse(JSON.stringify(req));
    const candCopy = JSON.parse(JSON.stringify(candidateS24PremiumBest));

    const pRes = evaluateProductLevelDecisions(req, [candidateS24PremiumBest]);
    const groupCopy = JSON.parse(JSON.stringify(pRes.bestProductGroup));

    evaluateOfferLevelDecisions(req, pRes.bestProductGroup, [candidateS24PremiumBest]);

    expect(req).toEqual(reqCopy);
    expect(candidateS24PremiumBest).toEqual(candCopy);
    expect(pRes.bestProductGroup).toEqual(groupCopy);
  });

  test("12. Realistic electronics scenario: Samsung vs Apple, multiple Samsung listings, cheaper vs higher-quality sellers", () => {
    const req = buildRecommendationRequest("Samsung Galaxy S24 with 256GB storage");
    const candidates = [
      candidateS24CheapUnreliable, // ₹35k, unreliable seller
      candidateS24MidValue,        // ₹40k, Flipkart 95 rating
      candidateS24PremiumBest,     // ₹42k, Amazon 100 rating
      candidateIPhone15            // ₹65k, Apple
    ];

    const pRes = evaluateProductLevelDecisions(req, candidates);
    expect(pRes.bestProductGroup?.fingerprint).toBe("samsung|galaxy s24");

    const oRes = evaluateOfferLevelDecisions(req, pRes.bestProductGroup, candidates);
    expect(oRes.cheapestOffer).toBe(candidateS24CheapUnreliable);
    expect(oRes.bestValueOffer).toBe(candidateS24MidValue);
    expect(oRes.bestOffer).toBe(candidateS24PremiumBest);
  });

  test("13. Selected product and selected offer share identical canonical product fingerprint", () => {
    const candidates = [candidateS24PremiumBest, candidateIPhone15];
    const pRes = evaluateProductLevelDecisions(null, candidates);
    const oRes = evaluateOfferLevelDecisions(null, pRes.bestProductGroup, candidates);

    expect(oRes.bestOffer?.product?.fingerprint).toBe(pRes.bestProductGroup?.fingerprint);
  });

  test("14. Null/empty input safety", () => {
    const pRes = evaluateProductLevelDecisions(null, []);
    expect(pRes.bestProductGroup).toBeNull();

    const oRes = evaluateOfferLevelDecisions(null, null);
    expect(oRes.bestOffer).toBeNull();
    expect(oRes.cheapestOffer).toBeNull();
    expect(oRes.bestValueOffer).toBeNull();
  });
});
