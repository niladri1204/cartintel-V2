import { describe, test, expect } from "vitest";
import { evaluateOfferLevelDecisions } from "../offerDecision";
import { evaluateProductLevelDecisions } from "../productDecision";
import { selectBestRecommendation } from "../decisionIntelligence";
import { buildExplainableRecommendation } from "../decisionExplanation";
import type { RecommendationRequest, RecommendationCandidate } from "../../recommendationTypes";

describe("Phase 5.X — Cheapest & Best-Value Offer Selection Tests", () => {
  const currentMyntraOffer: RecommendationCandidate = {
    product: {
      originalTitle: "Maybelline New York Lash Sensational Sky High Mascara 7.2ml",
      originalPrice: 799,
      originalCurrency: "INR",
      brand: "Maybelline",
      model: "Lash Sensational Sky High Mascara",
      category: "Beauty",
      volume: "7.2ml",
      fingerprint: "maybelline|lash sensational sky high mascara|7.2ml",
      confidence: 95,
      metadata: {
        marketplace: "Myntra",
        hostname: "www.myntra.com",
        detectedAt: Date.now(),
      },
    },
    isCurrentProduct: true,
    variantState: "explicitly_matching",
    isRefurbishedOrUsed: false,
    isUnavailable: false,
    currencyMismatch: false,
    identityConfidenceScore: 95,
    duplicateRedundancyScore: 0,
    marketplaceReliabilityScore: 95,
    finalRankingScore: 90,
    qualityScore: 90,
    priceAvailabilityScore: 75,
  };

  const cheaperAmazonOffer: RecommendationCandidate = {
    product: {
      originalTitle: "Maybelline New York Lash Sensational Sky High Mascara 7.2ml - Very Black",
      originalPrice: 599,
      originalCurrency: "INR",
      brand: "Maybelline",
      model: "Lash Sensational Sky High Mascara",
      category: "Beauty",
      volume: "7.2ml",
      fingerprint: "maybelline|lash sensational sky high mascara|7.2ml",
      confidence: 90,
      metadata: {
        marketplace: "Amazon",
        hostname: "www.amazon.in",
        detectedAt: Date.now(),
      },
    },
    isCurrentProduct: false,
    variantState: "explicitly_matching",
    isRefurbishedOrUsed: false,
    isUnavailable: false,
    currencyMismatch: false,
    identityConfidenceScore: 90,
    duplicateRedundancyScore: 0,
    marketplaceReliabilityScore: 95,
    finalRankingScore: 92,
    qualityScore: 90,
    priceAvailabilityScore: 95,
  };

  const cheapDifferentVariantOffer: RecommendationCandidate = {
    product: {
      originalTitle: "Maybelline Lash Sensational Mini 3ml",
      originalPrice: 299,
      originalCurrency: "INR",
      brand: "Maybelline",
      model: "Lash Sensational Mini",
      category: "Beauty",
      volume: "3ml", // Incompatible volume
      fingerprint: "maybelline|lash sensational mini|3ml",
      confidence: 85,
      metadata: {
        marketplace: "Purplle",
        hostname: "www.purplle.com",
        detectedAt: Date.now(),
      },
    },
    isCurrentProduct: false,
    variantState: "explicitly_conflicting",
    isRefurbishedOrUsed: false,
    isUnavailable: false,
    currencyMismatch: false,
    identityConfidenceScore: 75,
    duplicateRedundancyScore: 0,
    marketplaceReliabilityScore: 90,
    finalRankingScore: 70,
    qualityScore: 70,
    priceAvailabilityScore: 100,
  };

  // Test A: Myntra is not selected merely because it is the current page
  test("A. Myntra is not selected merely because it is the current page when cheaper trusted offer exists", () => {
    const candidates = [currentMyntraOffer, cheaperAmazonOffer];
    const req: RecommendationRequest = { candidates };

    const prodDec = evaluateProductLevelDecisions(req, candidates);
    const offerDec = evaluateOfferLevelDecisions(req, prodDec.bestProductGroup, candidates);

    // Amazon must be chosen as cheapestOffer and bestOffer because it's ₹599 vs Myntra ₹799
    expect(offerDec.cheapestOffer).toBe(cheaperAmazonOffer);
    expect(offerDec.bestOffer).toBe(cheaperAmazonOffer);
    expect(offerDec.cheapestOffer?.product?.metadata?.marketplace).toBe("Amazon");
  });

  // Test B: Cheaper valid Amazon/Purplle/Nykaa offer becomes cheapestOffer for same canonical product
  test("B. A cheaper valid Amazon/Purplle/Nykaa offer becomes cheapestOffer when it is the same canonical product", () => {
    const purplleOffer: RecommendationCandidate = {
      ...cheaperAmazonOffer,
      product: {
        ...cheaperAmazonOffer.product!,
        originalPrice: 549,
        metadata: { marketplace: "Purplle", hostname: "www.purplle.com", detectedAt: Date.now() },
      },
    };

    const candidates = [currentMyntraOffer, cheaperAmazonOffer, purplleOffer];
    const req: RecommendationRequest = { candidates };

    const prodDec = evaluateProductLevelDecisions(req, candidates);
    const offerDec = evaluateOfferLevelDecisions(req, prodDec.bestProductGroup, candidates);

    expect(offerDec.cheapestOffer).toBe(purplleOffer);
    expect(offerDec.cheapestOffer?.product?.originalPrice).toBe(549);
    expect(offerDec.cheapestOffer?.product?.metadata?.marketplace).toBe("Purplle");
  });

  // Test C: Cheaper different variant does NOT become cheapestOffer
  test("C. A cheaper but different variant does NOT become cheapestOffer", () => {
    const candidates = [currentMyntraOffer, cheaperAmazonOffer, cheapDifferentVariantOffer];
    const req: RecommendationRequest = { candidates };

    const prodDec = evaluateProductLevelDecisions(req, candidates);
    const offerDec = evaluateOfferLevelDecisions(req, prodDec.bestProductGroup, candidates);

    // Mini 3ml (₹299) must NOT be selected as cheapestOffer for 7.2ml canonical product group
    expect(offerDec.cheapestOffer).not.toBe(cheapDifferentVariantOffer);
    expect(offerDec.cheapestOffer).toBe(cheaperAmazonOffer);
    expect(offerDec.cheapestOffer?.product?.volume).toBe("7.2ml");
  });

  // Test D: bestValueOffer can differ from cheapestOffer
  test("D. bestValueOffer can differ from cheapestOffer based on trust and quality signals", () => {
    const ultraCheapUnreliable: RecommendationCandidate = {
      product: {
        originalTitle: "Maybelline New York Lash Sensational Sky High Mascara 7.2ml",
        originalPrice: 520, // slightly cheaper
        originalCurrency: "INR",
        brand: "Maybelline",
        model: "Lash Sensational Sky High Mascara",
        category: "Beauty",
        volume: "7.2ml",
        fingerprint: "maybelline|lash sensational sky high mascara|7.2ml",
        confidence: 80,
        metadata: {
          marketplace: "UnknownStore",
          hostname: "unknownstore.com",
          detectedAt: Date.now(),
        },
      },
      isCurrentProduct: false,
      variantState: "explicitly_matching",
      isRefurbishedOrUsed: false,
      isUnavailable: false,
      currencyMismatch: false,
      identityConfidenceScore: 80,
      duplicateRedundancyScore: 0,
      marketplaceReliabilityScore: 35, // low trust
      finalRankingScore: 40,
      qualityScore: 40,
      priceAvailabilityScore: 100,
    };

    const candidates = [currentMyntraOffer, cheaperAmazonOffer, ultraCheapUnreliable];
    const req: RecommendationRequest = { candidates };

    const prodDec = evaluateProductLevelDecisions(req, candidates);
    const offerDec = evaluateOfferLevelDecisions(req, prodDec.bestProductGroup, candidates);

    // cheapestOffer is the lowest price (₹520)
    expect(offerDec.cheapestOffer).toBe(ultraCheapUnreliable);
    // bestValueOffer prefers trusted Amazon with high quality & reliability
    expect(offerDec.bestValueOffer).toBe(cheaperAmazonOffer);
    expect(offerDec.bestValueOffer).not.toBe(offerDec.cheapestOffer);
  });

  // Test E: Missing-price offers cannot become cheapestOffer
  test("E. Missing-price offers cannot become cheapestOffer", () => {
    const noPriceCandidate: RecommendationCandidate = {
      ...cheaperAmazonOffer,
      product: {
        ...cheaperAmazonOffer.product!,
        originalPrice: null,
      },
    };

    const zeroPriceCandidate: RecommendationCandidate = {
      ...cheaperAmazonOffer,
      product: {
        ...cheaperAmazonOffer.product!,
        originalPrice: 0,
      },
    };

    const req: RecommendationRequest = { candidates: [noPriceCandidate, zeroPriceCandidate] };
    const prodDec = evaluateProductLevelDecisions(req, [noPriceCandidate, zeroPriceCandidate]);
    const offerDec = evaluateOfferLevelDecisions(req, prodDec.bestProductGroup, [noPriceCandidate, zeroPriceCandidate]);

    expect(offerDec.cheapestOffer).toBeNull();
  });

  // Test F: Results remain deterministic across multiple runs
  test("F. Results remain deterministic across multiple runs", () => {
    const candidates = [currentMyntraOffer, cheaperAmazonOffer];
    const req: RecommendationRequest = { candidates };

    const rec1 = buildExplainableRecommendation(req, candidates);
    const rec2 = buildExplainableRecommendation(req, candidates);

    expect(rec1.cheapestOffer?.product?.originalPrice).toBe(rec2.cheapestOffer?.product?.originalPrice);
    expect(rec1.bestOffer?.product?.metadata?.marketplace).toBe(rec2.bestOffer?.product?.metadata?.marketplace);
    expect(rec1.bestValueOffer?.product?.metadata?.marketplace).toBe(rec2.bestValueOffer?.product?.metadata?.marketplace);
  });
});
