import { describe, test, expect } from "vitest";
import { evaluateOfferLevelDecisions, isVerifiedActionableOffer } from "../offerDecision";
import { evaluateProductLevelDecisions } from "../productDecision";
import { buildExplainableRecommendation } from "../decisionExplanation";
import { validatePurchaseUrlSafety, sanitizePurchaseUrl } from "../../purchaseSafety";
import type { RecommendationRequest, RecommendationCandidate } from "../../recommendationTypes";

describe("Phase 6.3 — Actionable Offer URL & Winner Selection Invariants", () => {
  // Test A: An unresolved ₹94,900 candidate cannot become cheapestOffer if it lacks a verified direct merchant URL.
  test("A. An unresolved ₹94,900 candidate cannot become cheapestOffer if it lacks a verified direct merchant URL", () => {
    const unresolvedCheapestCandidate: RecommendationCandidate = {
      product: {
        originalTitle: "Samsung Galaxy S24 Ultra (256GB, Titanium Gray)",
        originalPrice: 94900,
        originalCurrency: "INR",
        brand: "Samsung",
        model: "Galaxy S24 Ultra",
        category: "Electronics",
        fingerprint: "samsung|galaxy s24 ultra",
        originalUrl: null, // Unresolved candidate from discovery search proxy
        metadata: { marketplace: "UnknownVendor", hostname: "", detectedAt: Date.now() }
      },
      isCurrentProduct: false,
      variantState: "explicitly_matching",
      isRefurbishedOrUsed: false,
      isUnavailable: false,
      currencyMismatch: false,
      identityConfidenceScore: 90,
      duplicateRedundancyScore: 0,
      marketplaceReliabilityScore: 80,
      finalRankingScore: 90,
      qualityScore: 85,
      priceAvailabilityScore: 95
    };

    const verifiedHigherCandidate: RecommendationCandidate = {
      product: {
        originalTitle: "Samsung Galaxy S24 Ultra (256GB, Titanium Gray)",
        originalPrice: 97900,
        originalCurrency: "INR",
        brand: "Samsung",
        model: "Galaxy S24 Ultra",
        category: "Electronics",
        fingerprint: "samsung|galaxy s24 ultra",
        originalUrl: "https://www.amazon.in/dp/B0S24ULTRA",
        metadata: { marketplace: "Amazon", hostname: "amazon.in", detectedAt: Date.now() }
      },
      isCurrentProduct: false,
      variantState: "explicitly_matching",
      isRefurbishedOrUsed: false,
      isUnavailable: false,
      currencyMismatch: false,
      identityConfidenceScore: 95,
      duplicateRedundancyScore: 0,
      marketplaceReliabilityScore: 95,
      finalRankingScore: 95,
      qualityScore: 90,
      priceAvailabilityScore: 90
    };

    const candidates = [unresolvedCheapestCandidate, verifiedHigherCandidate];
    const req: RecommendationRequest = { candidates };

    const prodDec = evaluateProductLevelDecisions(req, candidates);
    const offerDec = evaluateOfferLevelDecisions(req, prodDec.bestProductGroup, candidates);

    // ₹94,900 unresolved candidate is not actionable
    expect(isVerifiedActionableOffer(unresolvedCheapestCandidate)).toBe(false);
    expect(isVerifiedActionableOffer(verifiedHigherCandidate)).toBe(true);

    // cheapestOffer MUST NOT be the unresolved candidate
    expect(offerDec.cheapestOffer).not.toBe(unresolvedCheapestCandidate);
    expect(offerDec.cheapestOffer).toBe(verifiedHigherCandidate);
    expect(offerDec.cheapestOffer?.product?.originalPrice).toBe(97900);
    expect(offerDec.cheapestOffer?.product?.originalUrl).toBe("https://www.amazon.in/dp/B0S24ULTRA");
  });

  // Test B: A verified ₹97,900 candidate can become cheapestOffer when lower-priced candidates are unresolved.
  test("B. A verified ₹97,900 candidate becomes cheapestOffer when lower-priced candidates are unresolved", () => {
    const unresolved1: RecommendationCandidate = {
      product: {
        originalTitle: "Samsung Galaxy S24 Ultra 256GB",
        originalPrice: 91000,
        originalCurrency: "INR",
        brand: "Samsung",
        model: "Galaxy S24 Ultra",
        category: "Electronics",
        fingerprint: "samsung|galaxy s24 ultra",
        originalUrl: undefined, // completely missing URL
        metadata: { marketplace: "MerchantA", hostname: "merchanta.com", detectedAt: Date.now() }
      },
      isCurrentProduct: false,
      variantState: "explicitly_matching",
      isRefurbishedOrUsed: false,
      isUnavailable: false,
      currencyMismatch: false,
      identityConfidenceScore: 90,
      duplicateRedundancyScore: 0,
      marketplaceReliabilityScore: 80,
      finalRankingScore: 90,
      qualityScore: 85,
      priceAvailabilityScore: 95
    };

    const unresolved2: RecommendationCandidate = {
      product: {
        originalTitle: "Samsung Galaxy S24 Ultra 256GB",
        originalPrice: 94900,
        originalCurrency: "INR",
        brand: "Samsung",
        model: "Galaxy S24 Ultra",
        category: "Electronics",
        fingerprint: "samsung|galaxy s24 ultra",
        originalUrl: "https://www.google.com/url?q=invalid", // search proxy that fails unwrapping
        metadata: { marketplace: "MerchantB", hostname: "merchantb.com", detectedAt: Date.now() }
      },
      isCurrentProduct: false,
      variantState: "explicitly_matching",
      isRefurbishedOrUsed: false,
      isUnavailable: false,
      currencyMismatch: false,
      identityConfidenceScore: 90,
      duplicateRedundancyScore: 0,
      marketplaceReliabilityScore: 80,
      finalRankingScore: 90,
      qualityScore: 85,
      priceAvailabilityScore: 95
    };

    const verifiedAmazon: RecommendationCandidate = {
      product: {
        originalTitle: "Samsung Galaxy S24 Ultra 256GB",
        originalPrice: 97900,
        originalCurrency: "INR",
        brand: "Samsung",
        model: "Galaxy S24 Ultra",
        category: "Electronics",
        fingerprint: "samsung|galaxy s24 ultra",
        originalUrl: "https://www.amazon.in/dp/B0S24ULTRA",
        metadata: { marketplace: "Amazon", hostname: "amazon.in", detectedAt: Date.now() }
      },
      isCurrentProduct: false,
      variantState: "explicitly_matching",
      isRefurbishedOrUsed: false,
      isUnavailable: false,
      currencyMismatch: false,
      identityConfidenceScore: 95,
      duplicateRedundancyScore: 0,
      marketplaceReliabilityScore: 95,
      finalRankingScore: 95,
      qualityScore: 90,
      priceAvailabilityScore: 90
    };

    const candidates = [unresolved1, unresolved2, verifiedAmazon];
    const req: RecommendationRequest = { candidates };

    const recResult = buildExplainableRecommendation(req, candidates);

    expect(recResult.cheapestOffer).toBe(verifiedAmazon);
    expect(recResult.cheapestOffer?.product?.originalPrice).toBe(97900);
    expect(recResult.allEligibleOffers).toHaveLength(1);
    expect(recResult.allEligibleOffers).toContain(verifiedAmazon);
  });

  // Test C: An unresolved candidate cannot become bestValueOffer.
  test("C. An unresolved candidate cannot become bestValueOffer", () => {
    const unresolvedBestValueCandidate: RecommendationCandidate = {
      product: {
        originalTitle: "Samsung Galaxy S24 Ultra (256GB, High Trust Unresolved)",
        originalPrice: 94990,
        originalCurrency: "INR",
        brand: "Samsung",
        model: "Galaxy S24 Ultra",
        category: "Electronics",
        fingerprint: "samsung|galaxy s24 ultra",
        originalUrl: null, // Missing resolved URL
        metadata: { marketplace: "TopStore", hostname: "topstore.com", detectedAt: Date.now() }
      },
      isCurrentProduct: false,
      variantState: "explicitly_matching",
      isRefurbishedOrUsed: false,
      isUnavailable: false,
      currencyMismatch: false,
      identityConfidenceScore: 99,
      duplicateRedundancyScore: 0,
      marketplaceReliabilityScore: 99,
      finalRankingScore: 99,
      qualityScore: 99,
      priceAvailabilityScore: 95
    };

    const verifiedAlternativeCandidate: RecommendationCandidate = {
      product: {
        originalTitle: "Samsung Galaxy S24 Ultra (256GB, Verified)",
        originalPrice: 97900,
        originalCurrency: "INR",
        brand: "Samsung",
        model: "Galaxy S24 Ultra",
        category: "Electronics",
        fingerprint: "samsung|galaxy s24 ultra",
        originalUrl: "https://www.croma.com/p/s24ultra",
        metadata: { marketplace: "Croma", hostname: "croma.com", detectedAt: Date.now() }
      },
      isCurrentProduct: false,
      variantState: "explicitly_matching",
      isRefurbishedOrUsed: false,
      isUnavailable: false,
      currencyMismatch: false,
      identityConfidenceScore: 95,
      duplicateRedundancyScore: 0,
      marketplaceReliabilityScore: 95,
      finalRankingScore: 95,
      qualityScore: 90,
      priceAvailabilityScore: 90
    };

    const candidates = [unresolvedBestValueCandidate, verifiedAlternativeCandidate];
    const req: RecommendationRequest = { candidates };

    const prodDec = evaluateProductLevelDecisions(req, candidates);
    const offerDec = evaluateOfferLevelDecisions(req, prodDec.bestProductGroup, candidates);

    expect(offerDec.bestValueOffer).not.toBe(unresolvedBestValueCandidate);
    expect(offerDec.bestValueOffer).toBe(verifiedAlternativeCandidate);
    expect(offerDec.bestValueOffer?.product?.originalUrl).toBe("https://www.croma.com/p/s24ultra");
  });

  // Test G & H: URL safety invariants — No fake, search, or proxy URLs can be accepted as verified direct merchant URLs.
  test("G & H. No Google/Serper proxy, dummy, or search URLs can be considered verified actionable URLs", () => {
    // Prohibited URLs
    expect(sanitizePurchaseUrl("http://fake.url")).toBeNull();
    expect(sanitizePurchaseUrl("undefined")).toBeNull();
    expect(sanitizePurchaseUrl("javascript:alert(1)")).toBeNull();

    // Google search / proxy URL rejection
    const googleSearchUrl = validatePurchaseUrlSafety("https://www.google.com/search?q=s24+ultra");
    expect(googleSearchUrl.isValid).toBe(false);
    expect(googleSearchUrl.isDirectMerchantUrl).toBe(false);

    const proxyGoogle = validatePurchaseUrlSafety("https://www.google.com/url?q=invalid");
    expect(proxyGoogle.isValid).toBe(false);
    expect(proxyGoogle.isDirectMerchantUrl).toBe(false);

    const dummyUrl = validatePurchaseUrlSafety("http://fake.url");
    expect(dummyUrl.isValid).toBe(false);
    expect(dummyUrl.isDirectMerchantUrl).toBe(false);

    const emptyUrl = validatePurchaseUrlSafety("");
    expect(emptyUrl.isValid).toBe(false);

    const nullUrl = validatePurchaseUrlSafety(null);
    expect(nullUrl.isValid).toBe(false);

    // Direct verified URLs
    const validAmazon = validatePurchaseUrlSafety("https://www.amazon.in/dp/B0S24ULTRA", "amazon.in");
    expect(validAmazon.isValid).toBe(true);
    expect(validAmazon.isDirectMerchantUrl).toBe(true);
    expect(validAmazon.hostname).toBe("amazon.in");

    const validFlipkart = validatePurchaseUrlSafety("https://www.flipkart.com/s24/p/1", "flipkart.com");
    expect(validFlipkart.isValid).toBe(true);
    expect(validFlipkart.isDirectMerchantUrl).toBe(true);
  });

  // Test I: Explanations and persisted offer set use the same actionable offers (no mismatch in price/winner)
  test("I. Recommendation explanation and winning offers maintain 100% price and merchant consistency", () => {
    const unresolvedCheap: RecommendationCandidate = {
      product: {
        originalTitle: "Samsung Galaxy S24 Ultra (256GB)",
        originalPrice: 94900,
        originalCurrency: "INR",
        brand: "Samsung",
        model: "Galaxy S24 Ultra",
        category: "Electronics",
        fingerprint: "samsung|galaxy s24 ultra",
        originalUrl: null,
        metadata: { marketplace: "UnresolvedStore", hostname: "unresolvedstore.com", detectedAt: Date.now() }
      },
      isCurrentProduct: false,
      variantState: "explicitly_matching",
      isRefurbishedOrUsed: false,
      isUnavailable: false,
      currencyMismatch: false,
      identityConfidenceScore: 90
    };

    const verifiedAmazon: RecommendationCandidate = {
      product: {
        originalTitle: "Samsung Galaxy S24 Ultra (256GB)",
        originalPrice: 97900,
        originalCurrency: "INR",
        brand: "Samsung",
        model: "Galaxy S24 Ultra",
        category: "Electronics",
        fingerprint: "samsung|galaxy s24 ultra",
        originalUrl: "https://www.amazon.in/dp/B0S24ULTRA",
        metadata: { marketplace: "Amazon", hostname: "amazon.in", detectedAt: Date.now() }
      },
      isCurrentProduct: false,
      variantState: "explicitly_matching",
      isRefurbishedOrUsed: false,
      isUnavailable: false,
      currencyMismatch: false,
      identityConfidenceScore: 95
    };

    const req: RecommendationRequest = {
      productContext: { currentProduct: verifiedAmazon.product },
      candidates: [unresolvedCheap, verifiedAmazon]
    };

    const recResult = buildExplainableRecommendation(req, [unresolvedCheap, verifiedAmazon]);

    // Explanations must match the actionable winning offer (₹97,900, Amazon), NEVER the unresolved candidate (₹94,900)
    expect(recResult.cheapestOffer?.product?.originalPrice).toBe(97900);
    expect(recResult.cheapestOffer?.product?.metadata?.marketplace).toBe("Amazon");
    expect(recResult.productOfferDetails?.cheapestOfferSummary).toContain("97900");
    expect(recResult.productOfferDetails?.cheapestOfferSummary).not.toContain("94900");

    expect(recResult.allEligibleOffers).toHaveLength(1);
    expect(recResult.allEligibleOffers[0].product.originalUrl).toBe("https://www.amazon.in/dp/B0S24ULTRA");
  });
});
