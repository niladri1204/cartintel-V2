import { describe, test, expect } from "vitest";
import { evaluateOfferLevelDecisions } from "../offerDecision";
import { evaluateProductLevelDecisions } from "../productDecision";
import { normalizeMarketplaceName } from "../../marketplace";
import type { RecommendationRequest, RecommendationCandidate } from "../../recommendationTypes";

describe("offerDecision - Phase 1.12.4.2 Offer-Level Decision", () => {
  const offerCheapUnreliable: RecommendationCandidate = {
    product: {
      brand: "samsung",
      category: "smartphone",
      originalPrice: 35000,
      originalCurrency: "INR",
      originalUrl: "https://www.unknownseller.com/s24",
      originalTitle: "Samsung Galaxy S24 (256GB)",
      normalizedTitle: "samsung galaxy s24 256gb",
      storage: "256GB",
      model: "Galaxy S24",
      confidence: 90,
      fingerprint: "samsung|galaxy s24",
      metadata: { marketplace: "UnknownSeller", hostname: "unknownseller.com", detectedAt: Date.now() }
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

  const offerMidValueReliable: RecommendationCandidate = {
    product: {
      brand: "samsung",
      category: "smartphone",
      originalPrice: 40000,
      originalCurrency: "INR",
      originalUrl: "https://www.flipkart.com/s24/p/123",
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

  const offerPremiumBest: RecommendationCandidate = {
    product: {
      brand: "samsung",
      category: "smartphone",
      originalPrice: 42000,
      originalCurrency: "INR",
      originalUrl: "https://www.amazon.in/dp/B0S24PREM",
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

  const offerIneligible: RecommendationCandidate = {
    product: {
      brand: "apple",
      category: "smartphone",
      originalPrice: 30000, // Cheapest price, but ineligible under hard constraint
      originalCurrency: "INR",
      originalUrl: "https://www.amazon.in/dp/B0IPHONE15",
      originalTitle: "Apple iPhone 15",
      normalizedTitle: "apple iphone 15",
      confidence: 95,
      fingerprint: "samsung|galaxy s24" // Mismatched brand under "only Samsung"
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

  test("1. Multiple offers for the same product evaluated cleanly", () => {
    const candidates = [offerCheapUnreliable, offerMidValueReliable, offerPremiumBest];
    const prodRes = evaluateProductLevelDecisions(null, candidates);
    const offerRes = evaluateOfferLevelDecisions(null, prodRes.bestProductGroup, candidates);

    expect(offerRes.evaluatedOfferCount).toBe(3);
    expect(offerRes.eligibleOfferCount).toBe(3);
  });

  test("2. Cases where all 3 selections (cheapest, bestValue, best) are DISTINCT offers", () => {
    const candidates = [offerCheapUnreliable, offerMidValueReliable, offerPremiumBest];
    const prodRes = evaluateProductLevelDecisions(null, candidates);
    const offerRes = evaluateOfferLevelDecisions(null, prodRes.bestProductGroup, candidates);

    expect(offerRes.cheapestOffer).toBe(offerCheapUnreliable);
    expect(offerRes.bestValueOffer).toBe(offerMidValueReliable);
    expect(offerRes.bestOffer).toBe(offerPremiumBest);

    // Verify all 3 selections are distinct candidates
    expect(offerRes.cheapestOffer).not.toBe(offerRes.bestValueOffer);
    expect(offerRes.bestValueOffer).not.toBe(offerRes.bestOffer);
    expect(offerRes.cheapestOffer).not.toBe(offerRes.bestOffer);
  });

  test("3. Cheapest offer selection", () => {
    const candidates = [offerCheapUnreliable, offerMidValueReliable];
    const prodRes = evaluateProductLevelDecisions(null, candidates);
    const offerRes = evaluateOfferLevelDecisions(null, prodRes.bestProductGroup, candidates);

    expect(offerRes.cheapestOffer).toBe(offerCheapUnreliable);
  });

  test("4. Best-value offer selection (quality/reputation-to-price distinct from cheapest)", () => {
    const candidates = [offerCheapUnreliable, offerMidValueReliable];
    const prodRes = evaluateProductLevelDecisions(null, candidates);
    const offerRes = evaluateOfferLevelDecisions(null, prodRes.bestProductGroup, candidates);

    expect(offerRes.bestValueOffer).toBe(offerMidValueReliable);
    expect(offerRes.bestValueOffer).not.toBe(offerRes.cheapestOffer);
  });

  test("5. Marketplace/merchant quality influence on best offer", () => {
    const candidates = [offerCheapUnreliable, offerPremiumBest];
    const prodRes = evaluateProductLevelDecisions(null, candidates);
    const offerRes = evaluateOfferLevelDecisions(null, prodRes.bestProductGroup, candidates);

    expect(offerRes.bestOffer).toBe(offerPremiumBest);
  });

  test("6. Hard-constraint exclusion (ineligible offer cannot become best/cheapest/value offer)", () => {
    const req: RecommendationRequest = {
      hardConstraints: [{ attribute: "brand", operator: "equals", value: "samsung" }]
    };
    const candidates = [offerIneligible, offerPremiumBest];
    const prodRes = evaluateProductLevelDecisions(req, candidates);
    const offerRes = evaluateOfferLevelDecisions(req, prodRes.bestProductGroup, candidates);

    expect(offerRes.cheapestOffer).toBe(offerPremiumBest);
    expect(offerRes.bestOffer).toBe(offerPremiumBest);
    expect(offerRes.bestValueOffer).toBe(offerPremiumBest);
  });

  test("7. Missing price/data handling", () => {
    const offerNoPrice: RecommendationCandidate = {
      ...offerPremiumBest,
      product: { ...offerPremiumBest.product!, originalPrice: null }
    };
    const candidates = [offerNoPrice, offerMidValueReliable];
    const prodRes = evaluateProductLevelDecisions(null, candidates);
    const offerRes = evaluateOfferLevelDecisions(null, prodRes.bestProductGroup, candidates);

    expect(offerRes.cheapestOffer).toBe(offerMidValueReliable);
  });

  test("8. Mixed-currency safety (only compares same currency offers)", () => {
    const offerUSD: RecommendationCandidate = {
      ...offerPremiumBest,
      product: { ...offerPremiumBest.product!, originalCurrency: "USD", originalPrice: 500 }
    };
    const candidates = [offerMidValueReliable, offerUSD];
    const prodRes = evaluateProductLevelDecisions(null, candidates);
    const offerRes = evaluateOfferLevelDecisions(null, prodRes.bestProductGroup, candidates);

    expect(offerRes.bestOffer).toBeDefined();
  });

  test("9. Deterministic tie-breaking", () => {
    const offerTied1: RecommendationCandidate = { ...offerPremiumBest, finalRankingScore: 90 };
    const offerTied2: RecommendationCandidate = { ...offerPremiumBest, finalRankingScore: 85 };

    const candidates = [offerTied1, offerTied2];
    const prodRes = evaluateProductLevelDecisions(null, candidates);
    const offerRes = evaluateOfferLevelDecisions(null, prodRes.bestProductGroup, candidates);

    expect(offerRes.bestOffer).toBe(offerTied1);
  });

  test("10. Candidate immutability", () => {
    const copy = JSON.parse(JSON.stringify(offerPremiumBest));
    const prodRes = evaluateProductLevelDecisions(null, [offerPremiumBest]);
    evaluateOfferLevelDecisions(null, prodRes.bestProductGroup, [offerPremiumBest]);

    expect(offerPremiumBest).toEqual(copy);
  });

  test("11. Request & product-group immutability", () => {
    const req: RecommendationRequest = { hardConstraints: [{ attribute: "brand", operator: "equals", value: "samsung" }] };
    const reqCopy = JSON.parse(JSON.stringify(req));

    const prodRes = evaluateProductLevelDecisions(req, [offerPremiumBest]);
    const groupCopy = JSON.parse(JSON.stringify(prodRes.bestProductGroup));

    evaluateOfferLevelDecisions(req, prodRes.bestProductGroup, [offerPremiumBest]);

    expect(req).toEqual(reqCopy);
    expect(prodRes.bestProductGroup).toEqual(groupCopy);
  });

  test("12. Empty/null input safety", () => {
    const res1 = evaluateOfferLevelDecisions(null, null);
    expect(res1.bestOffer).toBeNull();
    expect(res1.cheapestOffer).toBeNull();
    expect(res1.bestValueOffer).toBeNull();
    expect(res1.eligibleOfferCount).toBe(0);

    const res2 = evaluateOfferLevelDecisions(undefined, undefined);
    expect(res2.bestOffer).toBeNull();
  });

  test("13. Trusted merchant vs cheaper low-quality merchant: cheapest remain cheapest, trusted wins bestValue", () => {
    const cheapLowTrust: RecommendationCandidate = {
      product: {
        brand: "samsung",
        category: "smartphone",
        originalPrice: 24000,
        originalCurrency: "INR",
        originalTitle: "Samsung Galaxy S24 (Low Trust Seller)",
        normalizedTitle: "samsung galaxy s24 low trust seller",
        model: "Galaxy S24",
        confidence: 90,
        fingerprint: "samsung|galaxy s24",
        originalUrl: "https://www.unknownseller.com/item/123",
        metadata: { marketplace: "National%20mobile", hostname: "nationalmobile.com", detectedAt: Date.now() }
      },
      isRefurbishedOrUsed: false,
      finalRankingScore: 40,
      priceAvailabilityScore: 50,
      identityConfidenceScore: 90,
      qualityScore: 40,
      marketplaceReliabilityScore: 30,
      duplicateRedundancyScore: 0,
      isCurrentProduct: false,
      isUnavailable: false,
      currencyMismatch: false
    };

    const trustedHigherPrice: RecommendationCandidate = {
      product: {
        brand: "samsung",
        category: "smartphone",
        originalPrice: 24999,
        originalCurrency: "INR",
        originalTitle: "Samsung Galaxy S24 (Trusted Seller)",
        normalizedTitle: "samsung galaxy s24 trusted seller",
        model: "Galaxy S24",
        confidence: 95,
        fingerprint: "samsung|galaxy s24",
        originalUrl: "https://www.amazon.in/dp/B0D123456",
        metadata: { marketplace: "Amazon", hostname: "amazon.in", detectedAt: Date.now() }
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

    const candidates = [cheapLowTrust, trustedHigherPrice];
    const prodRes = evaluateProductLevelDecisions(null, candidates);
    const offerRes = evaluateOfferLevelDecisions(null, prodRes.bestProductGroup, candidates);

    // cheapestOffer MUST be the strictly lowest price (cheapLowTrust at 24000)
    expect(offerRes.cheapestOffer).toBe(cheapLowTrust);
    expect(offerRes.cheapestOffer?.product?.originalPrice).toBe(24000);

    // trustedHigherPrice (24999) wins bestValue and bestOffer because of superior quality & reputation
    expect(offerRes.bestValueOffer).toBe(trustedHigherPrice);
    expect(offerRes.bestOffer).toBe(trustedHigherPrice);
    expect(offerRes.bestValueOffer).not.toBe(offerRes.cheapestOffer);
  });

  test("14. Exact merchant URL preservation and numeric string price parsing", () => {
    const stringPriceOffer: RecommendationCandidate = {
      product: {
        brand: "samsung",
        category: "smartphone",
        originalPrice: "24371" as any, // Numeric string price
        originalCurrency: "INR",
        originalTitle: "Samsung S24 String Price",
        normalizedTitle: "samsung s24 string price",
        model: "Galaxy S24",
        confidence: 90,
        fingerprint: "samsung|galaxy s24",
        originalUrl: "https://www.desidime.com/deals/samsung-s24-deal-999",
        metadata: { marketplace: "Desidime", hostname: "desidime.com", detectedAt: Date.now() }
      },
      isRefurbishedOrUsed: false,
      finalRankingScore: 90,
      priceAvailabilityScore: 90,
      identityConfidenceScore: 90,
      qualityScore: 90,
      marketplaceReliabilityScore: 90,
      duplicateRedundancyScore: 0,
      isCurrentProduct: false,
      isUnavailable: false,
      currencyMismatch: false
    };

    const candidates = [stringPriceOffer];
    const prodRes = evaluateProductLevelDecisions(null, candidates);
    const offerRes = evaluateOfferLevelDecisions(null, prodRes.bestProductGroup, candidates);

    expect(offerRes.cheapestOffer).toBe(stringPriceOffer);
    expect(offerRes.cheapestOffer?.product?.originalUrl).toBe("https://www.desidime.com/deals/samsung-s24-deal-999");
  });

  test("15. Merchant display normalization for all 10 target marketplaces and malformed percent-encoding", () => {
    expect(normalizeMarketplaceName("Flipkart")).toBe("Flipkart");
    expect(normalizeMarketplaceName("Reliance%20digital")).toBe("Reliance Digital");
    expect(normalizeMarketplaceName("Addmecart")).toBe("Addmecart");
    expect(normalizeMarketplaceName("Sangeetha%20mobiles")).toBe("Sangeetha Mobiles");
    expect(normalizeMarketplaceName("Dotcom%20stores")).toBe("Dotcom Stores");
    expect(normalizeMarketplaceName("Unilet%20stores")).toBe("Unilet Stores");
    expect(normalizeMarketplaceName("Myg")).toBe("MyG");
    expect(normalizeMarketplaceName("Easyphones")).toBe("EasyPhones");
    expect(normalizeMarketplaceName("Desertcart")).toBe("Desertcart");
    expect(normalizeMarketplaceName("Ovantica")).toBe("Ovantica");

    // Malformed percent encoding safety
    expect(normalizeMarketplaceName("Reliance%20digital%999")).toBe("Reliance Digital%999");
    expect(normalizeMarketplaceName(null, "https://www.reliancedigital.in/p/1")).toBe("Reliance Digital");
    expect(normalizeMarketplaceName(null, "https://www.myg.in/p/2")).toBe("MyG");
    expect(normalizeMarketplaceName(null, "https://www.easyphones.com")).toBe("EasyPhones");
  });
});
