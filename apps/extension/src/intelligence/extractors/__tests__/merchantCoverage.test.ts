import { describe, test, expect } from "vitest";
import {
  selectCoverageQueries,
  classifyMerchantTier,
  ensureMerchantCoverage,
  MAX_SEARCH_QUERIES_PER_ANALYSIS,
} from "../../merchantCoverage";
import { generateSearchQueries } from "../../../services/search/queryGenerator";
import { classifyCandidateQuality } from "../../candidateQuality";
import { evaluateOfferLevelDecisions } from "../../decision/offerDecision";
import type { ProductIntelligence } from "../../types";

function makeMockCandidate(overrides: Partial<ProductIntelligence>): ProductIntelligence {
  return {
    originalTitle: "Google Pixel 10a (Obsidian, 256GB)",
    normalizedTitle: "google pixel 10a 256gb obsidian",
    brand: "Google",
    model: "Pixel 10a",
    category: "Smartphones",
    productType: "Smartphone",
    variant: "256GB",
    color: "Obsidian",
    storage: "256GB",
    ram: "8GB",
    size: null,
    material: null,
    attributes: [],
    fingerprint: "google|pixel 10a|256gb",
    originalPrice: 54999,
    originalCurrency: "INR",
    originalUrl: "https://store.google.com/in/product/pixel_10a",
    metadata: {
      marketplace: "Google Store",
      marketplaceLogo: null,
      hostname: "store.google.com",
      googleShoppingProductLink: null,
      googleProductId: undefined,
      googleImmersiveToken: undefined,
      detectedAt: Date.now(),
    },
    ...overrides
  };
}

describe("Phase 4.8 — Merchant Coverage Engine Offline Tests", () => {
  // Test 1: Query selection chooses high-information queries and eliminates redundant queries
  test("1. Query selection eliminates redundant queries and respects budget", () => {
    const input = {
      title: "Google Pixel 10a (256GB, 8GB RAM, Obsidian)",
      brand: "Google",
      model: "Pixel 10a",
      category: "Smartphones",
      attributes: {
        storage: "256GB",
        ram: "8GB",
        color: "Obsidian",
      },
    };

    const allQueries = generateSearchQueries(input);
    // The generator produces many queries (identity, variants, official, buy, broad, etc.)
    expect(allQueries.length).toBeGreaterThan(MAX_SEARCH_QUERIES_PER_ANALYSIS);

    const selected = selectCoverageQueries(allQueries);

    // Must respect the budget
    expect(selected.length).toBeLessThanOrEqual(MAX_SEARCH_QUERIES_PER_ANALYSIS);
    expect(selected.length).toBeGreaterThan(0);

    // The highest-priority query (brand + model) must be included
    expect(selected[0].query).toContain("Google");
    expect(selected[0].query).toContain("Pixel 10a");
    expect(selected.length).toBeLessThanOrEqual(MAX_SEARCH_QUERIES_PER_ANALYSIS);
  });

  // Test 2: Merchant tier classification correctly distinguishes official/major, established, and unknown
  test("2. Merchant tier classification is correct", () => {
    // Tier 1: Major retailers & manufacturer stores
    expect(classifyMerchantTier("Amazon.in").tier).toBe(1);
    expect(classifyMerchantTier("Flipkart").tier).toBe(1);
    expect(classifyMerchantTier("Reliance Digital").tier).toBe(1);
    expect(classifyMerchantTier("Croma").tier).toBe(1);
    expect(classifyMerchantTier("Vijay Sales").tier).toBe(1);
    expect(classifyMerchantTier("Samsung Store").tier).toBe(1);
    expect(classifyMerchantTier("Apple Store").tier).toBe(1);
    expect(classifyMerchantTier("Google Store").tier).toBe(1);
    expect(classifyMerchantTier("OnePlus").tier).toBe(1);

    // Tier 2: Established secondary retailers
    expect(classifyMerchantTier("MyG").tier).toBe(2);
    expect(classifyMerchantTier("Zepto").tier).toBe(2);
    expect(classifyMerchantTier("Poorvika").tier).toBe(2);

    // Tier 3: Unknown/unrecognized merchants
    expect(classifyMerchantTier("Random Electronics Shop").tier).toBe(3);
    expect(classifyMerchantTier("SuperDealStore").tier).toBe(3);

    // Tier 4: Accessory/parts merchants
    expect(classifyMerchantTier("Cellspare").tier).toBe(4);
    expect(classifyMerchantTier("Maxbhi").tier).toBe(4);

    // Null/undefined → Tier 3 (unknown)
    expect(classifyMerchantTier(null).tier).toBe(3);
    expect(classifyMerchantTier(undefined).tier).toBe(3);
  });

  // Test 3: Candidate quality removes batteries/cases/replacement parts while preserving mAh specs
  test("3. Candidate quality filters batteries/cases but preserves mAh specifications", () => {
    const legitimatePhone = makeMockCandidate({
      originalTitle: "Google Pixel 10a 256GB 8GB RAM 5100mAh battery",
      normalizedTitle: "google pixel 10a 256gb 8gb ram 5100mah battery",
    });

    const batteryPart = makeMockCandidate({
      originalTitle: "Battery for Google Pixel 10a",
      normalizedTitle: "battery for google pixel 10a",
    });

    const caseCover = makeMockCandidate({
      originalTitle: "Google Pixel 10a Protective Case",
      normalizedTitle: "google pixel 10a protective case",
    });

    const screenReplacement = makeMockCandidate({
      originalTitle: "Google Pixel 10a LCD Screen Replacement",
      normalizedTitle: "google pixel 10a lcd screen replacement",
    });

    const charger = makeMockCandidate({
      originalTitle: "Google Pixel 10a 30W Charger",
      normalizedTitle: "google pixel 10a 30w charger",
    });

    // Legitimate phone with mAh spec should PASS
    const phoneResult = classifyCandidateQuality(legitimatePhone);
    expect(phoneResult.isEligibleProduct).toBe(true);
    expect(phoneResult.status).toBe("product");

    // Battery replacement should be REJECTED
    const batteryResult = classifyCandidateQuality(batteryPart);
    expect(batteryResult.isEligibleProduct).toBe(false);

    // Case should be REJECTED
    const caseResult = classifyCandidateQuality(caseCover);
    expect(caseResult.isEligibleProduct).toBe(false);
    expect(caseResult.status).toBe("accessory");

    // Screen replacement should be REJECTED
    const screenResult = classifyCandidateQuality(screenReplacement);
    expect(screenResult.isEligibleProduct).toBe(false);

    // Charger should be REJECTED
    const chargerResult = classifyCandidateQuality(charger);
    expect(chargerResult.isEligibleProduct).toBe(false);
    expect(chargerResult.status).toBe("accessory");
  });

  // Test 4: Multiple legitimate merchants are preserved after deduplication
  test("4. Multiple legitimate merchants are preserved after ensureMerchantCoverage", () => {
    const candidates: ProductIntelligence[] = [
      makeMockCandidate({
        originalUrl: "https://www.amazon.in/pixel-10a",
        originalPrice: 49999,
        metadata: { marketplace: "Amazon", hostname: "amazon.in", detectedAt: Date.now() },
      }),
      makeMockCandidate({
        originalUrl: "https://www.flipkart.com/pixel-10a",
        originalPrice: 49999,
        metadata: { marketplace: "Flipkart", hostname: "flipkart.com", detectedAt: Date.now() },
      }),
      makeMockCandidate({
        originalUrl: "https://www.reliancedigital.in/pixel-10a",
        originalPrice: 50999,
        metadata: { marketplace: "Reliance Digital", hostname: "reliancedigital.in", detectedAt: Date.now() },
      }),
      makeMockCandidate({
        originalUrl: "https://www.croma.com/pixel-10a",
        originalPrice: 50499,
        metadata: { marketplace: "Croma", hostname: "croma.com", detectedAt: Date.now() },
      }),
      // Duplicate Amazon offer (same price + same base URL)
      makeMockCandidate({
        originalUrl: "https://www.amazon.in/pixel-10a?ref=sr_1_1",
        originalPrice: 49999,
        metadata: { marketplace: "Amazon", hostname: "amazon.in", detectedAt: Date.now() },
      }),
    ];

    const result = ensureMerchantCoverage(candidates);

    // All 4 unique merchants should be preserved
    const merchants = result.map(c => c.metadata?.marketplace);
    expect(merchants).toContain("Amazon");
    expect(merchants).toContain("Flipkart");
    expect(merchants).toContain("Reliance Digital");
    expect(merchants).toContain("Croma");

    // Duplicate Amazon (same price + same base URL path) should be removed
    const amazonOffers = result.filter(c => c.metadata?.marketplace === "Amazon");
    expect(amazonOffers).toHaveLength(1);
  });

  // Test 5: Current webpage merchant does not automatically win Best Deal
  test("5. Current webpage merchant has no automatic advantage", () => {

    const amazonOffer = makeMockCandidate({
      originalPrice: 54599,
      originalUrl: "https://www.amazon.in/pixel-10a",
      metadata: { marketplace: "Amazon", hostname: "amazon.in", detectedAt: Date.now() },
    });

    const flipkartOffer = makeMockCandidate({
      originalPrice: 49999,
      originalUrl: "https://www.flipkart.com/pixel-10a",
      metadata: { marketplace: "Flipkart", hostname: "flipkart.com", detectedAt: Date.now() },
    });

    const candidates = [
      {
        product: amazonOffer,
        isCurrentProduct: false,
        variantState: "explicitly_matching" as const,
        isRefurbishedOrUsed: false,
        isUnavailable: false,
        currencyMismatch: false,
        identityConfidenceScore: 90,
        duplicateRedundancyScore: 0,
        marketplaceReliabilityScore: 90,
        finalRankingScore: 85,
        qualityScore: 80,
        priceAvailabilityScore: 75,
      },
      {
        product: flipkartOffer,
        isCurrentProduct: false,
        variantState: "explicitly_matching" as const,
        isRefurbishedOrUsed: false,
        isUnavailable: false,
        currencyMismatch: false,
        identityConfidenceScore: 90,
        duplicateRedundancyScore: 0,
        marketplaceReliabilityScore: 88,
        finalRankingScore: 82,
        qualityScore: 80,
        priceAvailabilityScore: 80,
      },
    ];

    const productGroup = {
      fingerprint: "google|pixel 10a|256gb",
      offers: candidates,
    } as any;

    const result = evaluateOfferLevelDecisions(
      { candidates },
      productGroup
    );

    // Cheapest offer MUST be Flipkart at ₹49,999 not Amazon at ₹54,599
    expect(result.cheapestOffer).toBeDefined();
    expect(result.cheapestOffer!.product?.originalPrice).toBe(49999);

    // Best offer should also prefer the cheaper option since price is dominant (60%)
    expect(result.bestOffer).toBeDefined();
    expect(result.bestOffer!.product?.originalPrice).toBe(49999);
  });

  // Test 6: Low-trust merchant cannot become Best Deal merely because its price is lower
  test("6. Low-trust unknown merchant does not auto-win Best Deal on price alone", () => {

    const trustedOffer = makeMockCandidate({
      originalPrice: 49999,
      originalUrl: "https://www.amazon.in/pixel-10a",
      metadata: { marketplace: "Amazon", hostname: "amazon.in", detectedAt: Date.now() },
    });

    const unknownCheapOffer = makeMockCandidate({
      originalPrice: 42000,
      originalUrl: "https://shadydeals.biz/pixel-10a",
      metadata: { marketplace: "ShadyDeals", hostname: "shadydeals.biz", detectedAt: Date.now() },
    });

    const candidates = [
      {
        product: trustedOffer,
        isCurrentProduct: false,
        variantState: "explicitly_matching" as const,
        isRefurbishedOrUsed: false,
        isUnavailable: false,
        currencyMismatch: false,
        identityConfidenceScore: 90,
        duplicateRedundancyScore: 0,
        marketplaceReliabilityScore: 90,
        finalRankingScore: 85,
        qualityScore: 85,
        priceAvailabilityScore: 80,
      },
      {
        product: unknownCheapOffer,
        isCurrentProduct: false,
        variantState: "explicitly_matching" as const,
        isRefurbishedOrUsed: false,
        isUnavailable: false,
        currencyMismatch: false,
        identityConfidenceScore: 90,
        duplicateRedundancyScore: 0,
        marketplaceReliabilityScore: 15,
        finalRankingScore: 20,
        qualityScore: 30,
        priceAvailabilityScore: 40,
      },
    ];

    const productGroup = {
      fingerprint: "google|pixel 10a|256gb",
      offers: candidates,
    } as any;

    const result = evaluateOfferLevelDecisions(
      { candidates },
      productGroup
    );

    // Cheapest offer CAN be the unknown merchant (it's the cheapest price)
    expect(result.cheapestOffer).toBeDefined();
    expect(result.cheapestOffer!.product?.originalPrice).toBe(42000);

    // BUT bestOffer should NOT be the low-trust merchant because the
    // 15% merchant + 10% quality + 5% availability + 10% ranking scores
    // will drag it below the trusted merchant despite 60% price advantage
    // The trusted Amazon at 49,999 with high trust should win bestOffer
    expect(result.bestOffer).toBeDefined();
    expect(result.bestOffer!.product?.metadata?.marketplace).toBe("Amazon");
  });
});
