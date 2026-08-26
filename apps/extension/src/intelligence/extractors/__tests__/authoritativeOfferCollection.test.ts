import { describe, it, expect } from "vitest";
import type { ProductIntelligence } from "../../types";
import type { RecommendationCandidate, RecommendationRequest } from "../../recommendationTypes";
import { buildExplainableRecommendation } from "../../decision/decisionExplanation";
import { buildRecommendationRequest } from "../../intent/recommendationRequestBuilder";
import { evaluateProductLevelDecisions } from "../../decision/productDecision";
import { evaluateOfferLevelDecisions } from "../../decision/offerDecision";

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
    color: overrides.color || "Obsidian",
    fingerprint: overrides.fingerprint || "google|pixel 10a|256gb|obsidian",
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
    finalRankingScore: 90,
    priceAvailabilityScore: 90,
    identityConfidenceScore: 95,
    qualityScore: 90,
    marketplaceReliabilityScore: 90,
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
    source: "Amazon",
    metadata: { marketplace: "Amazon", tier: 1 }
  };

  // 12 distinct merchant offers for the same Google Pixel 10a 256GB
  const mock12EligibleOffers: RecommendationCandidate[] = [
    createCandidate({ source: "Amazon", metadata: { marketplace: "Amazon" }, originalPrice: 54999, color: "Obsidian", originalUrl: "https://amazon.in/dp/1" }),
    createCandidate({ source: "Flipkart", metadata: { marketplace: "Flipkart" }, originalPrice: 54599, color: "Hazel", originalUrl: "https://flipkart.com/p/2" }),
    createCandidate({ source: "Reliance Digital", metadata: { marketplace: "Reliance Digital" }, originalPrice: 54999, color: "Porcelain", originalUrl: "https://reliancedigital.in/p/3" }),
    createCandidate({ source: "Croma", metadata: { marketplace: "Croma" }, originalPrice: 55990, color: "Obsidian", originalUrl: "https://croma.com/p/4" }),
    createCandidate({ source: "Google Store", metadata: { marketplace: "Google Store" }, originalPrice: 59999, color: "Obsidian", originalUrl: "https://store.google.com/p/5" }),
    createCandidate({ source: "Vijay Sales", metadata: { marketplace: "Vijay Sales" }, originalPrice: 54790, color: "Hazel", originalUrl: "https://vijaysales.com/p/6" }),
    createCandidate({ source: "Zepto", metadata: { marketplace: "Zepto" }, originalPrice: 53999, color: "Obsidian", originalUrl: "https://zepto.in/p/7" }),
    createCandidate({ source: "MyG", metadata: { marketplace: "MyG" }, originalPrice: 54499, color: "Porcelain", originalUrl: "https://myg.in/p/8" }),
    createCandidate({ source: "Tata CLiQ", metadata: { marketplace: "Tata CLiQ" }, originalPrice: 54990, color: "Hazel", originalUrl: "https://tatacliq.com/p/9" }),
    createCandidate({ source: "Poorvika", metadata: { marketplace: "Poorvika" }, originalPrice: 54899, color: "Obsidian", originalUrl: "https://poorvika.com/p/10" }),
    createCandidate({ source: "Sangeetha", metadata: { marketplace: "Sangeetha" }, originalPrice: 54999, color: "Porcelain", originalUrl: "https://sangeethamobiles.com/p/11" }),
    createCandidate({ source: "Blinkit", metadata: { marketplace: "Blinkit" }, originalPrice: 54199, color: "Obsidian", originalUrl: "https://blinkit.com/p/12" }),
  ];

  it("1. 12 matched eligible merchant offers produce allEligibleOffers.length === 12", () => {
    const req: RecommendationRequest = {
      ...buildRecommendationRequest(currentProduct.normalizedTitle || currentProduct.originalTitle || ""),
      candidates: mock12EligibleOffers
    };

    const recResult = buildExplainableRecommendation(req, mock12EligibleOffers);

    expect(recResult).toBeDefined();
    expect(recResult.allEligibleOffers).toBeDefined();
    expect(recResult.allEligibleOffers!.length).toBe(12);
  });

  it("2. Different merchants with same product/price remain separate", () => {
    const candidateA = createCandidate({ source: "Amazon", metadata: { marketplace: "Amazon" }, originalPrice: 54599, originalUrl: "https://amazon.in/dp/A" });
    const candidateB = createCandidate({ source: "Flipkart", metadata: { marketplace: "Flipkart" }, originalPrice: 54599, originalUrl: "https://flipkart.com/p/B" });

    const req: RecommendationRequest = {
      ...buildRecommendationRequest("Google Pixel 10a"),
      candidates: [candidateA, candidateB]
    };

    const recResult = buildExplainableRecommendation(req, [candidateA, candidateB]);

    expect(recResult.allEligibleOffers?.length).toBe(2);
    const merchants = recResult.allEligibleOffers?.map(c => c.product?.metadata?.marketplace);
    expect(merchants).toContain("Amazon");
    expect(merchants).toContain("Flipkart");
  });

  it("3. Different colors of the same valid model remain separate offers, not separate canonical products", () => {
    const colorOffers = [
      createCandidate({ source: "Amazon", metadata: { marketplace: "Amazon" }, color: "Obsidian", fingerprint: "google|pixel 10a|256gb|obsidian" }),
      createCandidate({ source: "Flipkart", metadata: { marketplace: "Flipkart" }, color: "Hazel", fingerprint: "google|pixel 10a|256gb|hazel" }),
      createCandidate({ source: "Croma", metadata: { marketplace: "Croma" }, color: "Porcelain", fingerprint: "google|pixel 10a|256gb|porcelain" })
    ];

    const req: RecommendationRequest = {
      ...buildRecommendationRequest("Google Pixel 10a 256GB"),
      candidates: colorOffers
    };

    const productDecision = evaluateProductLevelDecisions(req, colorOffers);
    // All 3 colors must coalesce into 1 single canonical product group
    expect(productDecision.productGroups.length).toBe(1);
    expect(productDecision.productGroups[0].offers.length).toBe(3);

    const offerDecision = evaluateOfferLevelDecisions(req, productDecision.bestProductGroup, colorOffers);
    expect(offerDecision.allEligibleOffers?.length).toBe(3);
  });

  it("4. BestOffer, CheapestOffer and BestValueOffer are all selected from allEligibleOffers", () => {
    const req: RecommendationRequest = {
      ...buildRecommendationRequest("Google Pixel 10a"),
      candidates: mock12EligibleOffers
    };

    const recResult = buildExplainableRecommendation(req, mock12EligibleOffers);

    expect(recResult.bestOffer).toBeDefined();
    expect(recResult.cheapestOffer).toBeDefined();
    expect(recResult.bestValueOffer).toBeDefined();

    const allOffers = recResult.allEligibleOffers || [];
    expect(allOffers).toContain(recResult.bestOffer);
    expect(allOffers).toContain(recResult.cheapestOffer);
    expect(allOffers).toContain(recResult.bestValueOffer);
  });

  it("5. Available Marketplaces derived from allEligibleOffers includes every distinct merchant", () => {
    const req: RecommendationRequest = {
      ...buildRecommendationRequest("Google Pixel 10a"),
      candidates: mock12EligibleOffers
    };

    const recResult = buildExplainableRecommendation(req, mock12EligibleOffers);
    const allOffers = recResult.allEligibleOffers || [];

    const uniqueMarketplaces = Array.from(
      new Set(
        allOffers
          .map(c => c.product?.metadata?.marketplace || (c.product as any)?.source)
          .filter(Boolean)
      )
    );

    expect(uniqueMarketplaces.length).toBe(12);
    expect(uniqueMarketplaces).toContain("Amazon");
    expect(uniqueMarketplaces).toContain("Flipkart");
    expect(uniqueMarketplaces).toContain("Reliance Digital");
    expect(uniqueMarketplaces).toContain("Croma");
    expect(uniqueMarketplaces).toContain("Google Store");
    expect(uniqueMarketplaces).toContain("Vijay Sales");
    expect(uniqueMarketplaces).toContain("Zepto");
    expect(uniqueMarketplaces).toContain("MyG");
    expect(uniqueMarketplaces).toContain("Tata CLiQ");
    expect(uniqueMarketplaces).toContain("Poorvika");
    expect(uniqueMarketplaces).toContain("Sangeetha");
    expect(uniqueMarketplaces).toContain("Blinkit");
  });

  it("6. New comparison replaces old offer state and does not retain stale offers", () => {
    // Session 1: Old Pixel 9a search (2 offers)
    const oldPixel9aOffers = [
      createCandidate({ brand: "Google", model: "Pixel 9a", originalPrice: 42999, source: "Amazon" }),
      createCandidate({ brand: "Google", model: "Pixel 9a", originalPrice: 41999, source: "Flipkart" })
    ];

    let currentRecommendationResult: any = buildExplainableRecommendation(
      buildRecommendationRequest("Google Pixel 9a"),
      oldPixel9aOffers
    );
    expect(currentRecommendationResult.allEligibleOffers.length).toBe(2);

    // User triggers new compare on Pixel 10a: Atomic reset
    currentRecommendationResult = null; // Cleared

    // Session 2: New comparison results loaded
    currentRecommendationResult = buildExplainableRecommendation(
      buildRecommendationRequest("Google Pixel 10a"),
      mock12EligibleOffers
    );

    // Verify atomic replacement: exactly 12 offers, 0 old Pixel 9a offers
    expect(currentRecommendationResult.allEligibleOffers.length).toBe(12);
    const models = currentRecommendationResult.allEligibleOffers.map((c: any) => c.product?.model);
    expect(models.every((m: string) => m === "Pixel 10a")).toBe(true);
    expect(models).not.toContain("Pixel 9a");
  });
});
