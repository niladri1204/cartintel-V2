import { describe, it, expect } from "vitest";
import type { ProductIntelligence } from "../../types";
import type { RecommendationCandidate, RecommendationRequest } from "../../recommendationTypes";
import { buildExplainableRecommendation } from "../../decision/decisionExplanation";
import { buildRecommendationRequest } from "../../intent/recommendationRequestBuilder";
import { evaluateProductLevelDecisions } from "../../decision/productDecision";
import { evaluateOfferLevelDecisions } from "../../decision/offerDecision";
import { processSearchResults } from "../../../services/search/mapper";
import { ensureMerchantCoverage } from "../../merchantCoverage";
import { matchCandidates } from "../../integration";

function createCandidate(overrides: any): RecommendationCandidate {
  const prod: ProductIntelligence = {
    originalTitle: overrides.originalTitle || "Google Pixel 10a 256GB Smartphone",
    normalizedTitle: overrides.normalizedTitle || "google pixel 10a 256gb",
    originalPrice: overrides.originalPrice ?? 54999,
    originalCurrency: overrides.originalCurrency || "INR",
    originalImage: "https://example.com/img.jpg",
    originalUrl: overrides.originalUrl || "https://example.com/item",
    brand: overrides.brand || "Google",
    model: overrides.model || "Pixel 10a",
    category: overrides.category || "Smartphones",
    storage: overrides.storage || "256GB",
    ram: overrides.ram || "8GB",
    color: overrides.color || "Obsidian",
    fingerprint: overrides.fingerprint || "google|pixel 10a|256gb|8gb|obsidian",
    metadata: {
      marketplace: overrides.metadata?.marketplace || overrides.source || "Merchant",
      hostname: overrides.metadata?.hostname || "example.com",
      detectedAt: Date.now()
    }
  };

  return {
    product: prod,
    isCurrentProduct: overrides.isCurrentProduct || false,
    variantState: "explicitly_matching",
    isRefurbishedOrUsed: false,
    isUnavailable: false,
    savingsValue: null,
    savingsPercentage: null,
    currencyMismatch: false,
    finalRankingScore: overrides.finalRankingScore ?? 90,
    priceAvailabilityScore: overrides.priceAvailabilityScore ?? 90,
    identityConfidenceScore: overrides.identityConfidenceScore ?? 95,
    qualityScore: overrides.qualityScore ?? 90,
    marketplaceReliabilityScore: overrides.marketplaceReliabilityScore ?? 90,
    duplicateRedundancyScore: 0
  };
}

describe("Phase 4.9.3 — Authoritative Offer Collection & Popup State Consistency", () => {
  const currentProduct: ProductIntelligence = {
    originalTitle: "Google Pixel 10a 5G (256 GB, 8 GB RAM) Obsidian",
    normalizedTitle: "google pixel 10a 5g (256 gb, 8 gb ram) obsidian",
    originalPrice: 59999,
    originalCurrency: "INR",
    originalImage: "https://amazon.in/img.jpg",
    originalUrl: "https://www.amazon.in/dp/B0PIXEL10A_REF",
    brand: "Google",
    model: "Pixel 10a",
    category: "Smartphones",
    storage: "256GB",
    ram: "8GB",
    color: "Obsidian",
    fingerprint: "google|pixel 10a|256gb|8gb|obsidian",
    metadata: {
      marketplace: "Amazon",
      hostname: "amazon.in",
      detectedAt: Date.now()
    }
  };

  it("1. Visual candidate Google Store + Text candidates Amazon & Flipkart all merge into final matched identity", () => {
    // Mock visual discovery result candidate
    const visualCandidates: ProductIntelligence[] = [
      {
        originalTitle: "Google Pixel 10a 5G (256GB) - Google Store",
        normalizedTitle: "google pixel 10a 5g 256gb",
        originalPrice: 59999,
        originalCurrency: "INR",
        originalImage: "https://store.google.com/img.jpg",
        originalUrl: "https://store.google.com/product/pixel_10a",
        brand: "Google",
        model: "Pixel 10a",
        category: "Smartphones",
        storage: "256GB",
        fingerprint: "google|pixel 10a|256gb|google store",
        metadata: {
          marketplace: "Google Store",
          hostname: "store.google.com",
          detectedAt: Date.now()
        }
      }
    ];

    // Mock text discovery raw results
    const rawTextResults = [
      {
        title: "Google Pixel 10a 256GB Obsidian",
        price: 54599,
        extracted_price: 54599,
        currency: "INR",
        url: "https://www.amazon.in/dp/B0PIXEL10A_TEXT",
        source: "Amazon",
        merchant: "Amazon",
        marketplace: "Amazon"
      },
      {
        title: "Google Pixel 10a 256GB Obsidian",
        price: 53999,
        extracted_price: 53999,
        currency: "INR",
        url: "https://www.flipkart.com/pixel-10a/p/1",
        source: "Flipkart",
        merchant: "Flipkart",
        marketplace: "Flipkart"
      }
    ];

    // Follow orchestrator candidate merging
    const textCandidates = processSearchResults(rawTextResults);
    const combinedCandidates = [...textCandidates, ...visualCandidates];

    const seen = new Set<string>();
    const mergedCandidates = combinedCandidates.filter(candidate => {
      const merchant =
        candidate.metadata?.marketplace?.trim().toLowerCase() ||
        candidate.metadata?.hostname?.trim().toLowerCase() ||
        (candidate as any).source?.trim().toLowerCase() ||
        "unknown";
      const url = candidate.originalUrl?.trim() || "";
      const key = [
        candidate.fingerprint || candidate.normalizedTitle || "unknown",
        merchant,
        candidate.originalPrice ?? "unknown",
        url
      ].join("|");
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    const dedupedCandidates = ensureMerchantCoverage(mergedCandidates);
    const identity = matchCandidates(currentProduct, dedupedCandidates);

    // Both text and visual candidates must be present in the matched identity
    expect(identity.products.length).toBeGreaterThanOrEqual(3);
    const sources = identity.products.map(p => p.metadata?.marketplace || (p as any).source);
    expect(sources).toContain("Google Store"); // from visual
    expect(sources).toContain("Amazon"); // from text
    expect(sources).toContain("Flipkart"); // from text
  });

  it("2. Pixel 10a 256GB Obsidian + Pixel 10a 256GB Hazel + Pixel 10a 256GB Porcelain remain in the same canonical offer family", () => {
    const colorOffers = [
      createCandidate({ source: "Amazon", color: "Obsidian", storage: "256GB", originalPrice: 54999 }),
      createCandidate({ source: "Flipkart", color: "Hazel", storage: "256GB", originalPrice: 54599 }),
      createCandidate({ source: "Croma", color: "Porcelain", storage: "256GB", originalPrice: 54990 })
    ];

    const req: RecommendationRequest = {
      ...buildRecommendationRequest("Google Pixel 10a 256GB"),
      candidates: colorOffers
    };

    const productDecision = evaluateProductLevelDecisions(req, colorOffers);
    expect(productDecision.productGroups.length).toBe(1);

    const offerDecision = evaluateOfferLevelDecisions(req, productDecision.bestProductGroup, colorOffers);
    expect(offerDecision.allEligibleOffers?.length).toBe(3);
    const colors = offerDecision.allEligibleOffers?.map(c => c.product?.color);
    expect(colors).toContain("Obsidian");
    expect(colors).toContain("Hazel");
    expect(colors).toContain("Porcelain");
  });

  it("3. Pixel 10a 128GB does NOT merge with Pixel 10a 256GB", () => {
    const offer256GB = createCandidate({ source: "Amazon", storage: "256GB", originalPrice: 54999 });
    const offer128GB = createCandidate({ source: "Flipkart", storage: "128GB", originalPrice: 48999 });

    const req: RecommendationRequest = {
      ...buildRecommendationRequest("Google Pixel 10a 256GB"),
      candidates: [offer256GB, offer128GB]
    };

    const productDecision = evaluateProductLevelDecisions(req, [offer256GB, offer128GB]);
    // Must be in separate product groups due to distinct structural storage
    expect(productDecision.productGroups.length).toBe(2);

    const group256 = productDecision.productGroups.find(g => g.fingerprint.includes("256gb")) || productDecision.bestProductGroup;
    const offerDecision = evaluateOfferLevelDecisions(req, group256, [offer256GB, offer128GB]);
    // The selected 256GB canonical offer family must contain only the 256GB offer
    expect(offerDecision.allEligibleOffers?.length).toBe(1);
    expect(offerDecision.allEligibleOffers?.[0].product?.storage).toBe("256GB");
  });

  it("4. Different merchants with same product remain separate offers", () => {
    const amazonOffer = createCandidate({ source: "Amazon", originalPrice: 54599, originalUrl: "https://amazon.in/dp/1" });
    const flipkartOffer = createCandidate({ source: "Flipkart", originalPrice: 54599, originalUrl: "https://flipkart.com/p/2" });

    const req: RecommendationRequest = {
      ...buildRecommendationRequest("Google Pixel 10a 256GB"),
      candidates: [amazonOffer, flipkartOffer]
    };

    const recResult = buildExplainableRecommendation(req, [amazonOffer, flipkartOffer]);

    expect(recResult.allEligibleOffers?.length).toBe(2);
    const merchants = recResult.allEligibleOffers?.map(c => c.product?.metadata?.marketplace);
    expect(merchants).toContain("Amazon");
    expect(merchants).toContain("Flipkart");
  });

  it("5. allEligibleOffers preserves every eligible merchant offer while bestOffer/cheapestOffer/bestValueOffer each remain single selections", () => {
    const offers = [
      createCandidate({ source: "Amazon", originalPrice: 54999 }),
      createCandidate({ source: "Flipkart", originalPrice: 54599 }),
      createCandidate({ source: "Reliance Digital", originalPrice: 54999 }),
      createCandidate({ source: "Croma", originalPrice: 55990 }),
      createCandidate({ source: "Vijay Sales", originalPrice: 54790 }),
      createCandidate({ source: "Zepto", originalPrice: 53999 }),
      createCandidate({ source: "MyG", originalPrice: 54499 }),
      createCandidate({ source: "Google Store", originalPrice: 59999 })
    ];

    const req: RecommendationRequest = {
      ...buildRecommendationRequest("Google Pixel 10a 256GB"),
      candidates: offers
    };

    const recResult = buildExplainableRecommendation(req, offers);

    expect(recResult.allEligibleOffers?.length).toBe(8);
    expect(recResult.bestOffer).toBeDefined();
    expect(recResult.cheapestOffer).toBeDefined();
    expect(recResult.bestValueOffer).toBeDefined();

    // Verify best, cheapest, and bestValue are single items from allEligibleOffers
    expect(recResult.allEligibleOffers).toContain(recResult.bestOffer);
    expect(recResult.allEligibleOffers).toContain(recResult.cheapestOffer);
    expect(recResult.allEligibleOffers).toContain(recResult.bestValueOffer);
  });

  it("6. Amazon ₹59,999 vs Zepto ₹54,099: cheapestOffer = Zepto, bestOffer = Zepto", () => {
    const amazonCandidate = createCandidate({
      source: "Amazon",
      originalPrice: 59999,
      marketplaceReliabilityScore: 90,
      qualityScore: 90,
      finalRankingScore: 85
    });

    const zeptoCandidate = createCandidate({
      source: "Zepto",
      originalPrice: 54099,
      marketplaceReliabilityScore: 75,
      qualityScore: 85,
      finalRankingScore: 80
    });

    const candidates = [amazonCandidate, zeptoCandidate];
    const req: RecommendationRequest = {
      ...buildRecommendationRequest("Google Pixel 10a 256GB"),
      candidates
    };

    const recResult = buildExplainableRecommendation(req, candidates);

    // Zepto is ₹54,099 (significantly cheaper than Amazon ₹59,999)
    // Under 60% price-dominant weighting, Zepto must win cheapestOffer AND bestOffer
    expect(recResult.cheapestOffer?.product?.metadata?.marketplace).toBe("Zepto");
    expect(recResult.cheapestOffer?.product?.originalPrice).toBe(54099);

    expect(recResult.bestOffer?.product?.metadata?.marketplace).toBe("Zepto");
    expect(recResult.bestOffer?.product?.originalPrice).toBe(54099);
  });
});
