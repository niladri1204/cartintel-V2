import { describe, test, expect } from "vitest";
import { processSearchResults } from "../../../services/search/mapper";
import { matchCandidates } from "../../integration";
import { ensureMerchantCoverage } from "../../merchantCoverage";
import { buildExplainableRecommendation } from "../../decision/decisionExplanation";
import { buildRecommendationRequest } from "../../intent/recommendationRequestBuilder";
import { classifyCandidateQuality } from "../../candidateQuality";
import { reconcileVisualIdentity } from "../../visual/visualIdentityReconciliation";
import { DiscoveryEngine } from "../../../services/search/discoveryEngine";
import { MAX_SEARCH_QUERIES_PER_ANALYSIS } from "../../merchantCoverage";
import type { RawProductResult } from "../../../services/search/types";
import type { ProductIntelligence } from "../../types";
import type { SearchProvider, SearchRequest, SearchResponse } from "../../../services/search/searchProvider";
import type { SearchQueryInput } from "../../../services/search/queryGenerator";

/**
 * Phase 4.9 — Runtime Offer Funnel & Offer Retention Offline Tests
 *
 * Verifies that:
 * 1. 10 merchant offers remain separate after canonical matching.
 * 2. Accessories and replacement parts are removed while legitimate Pixel 10a offers remain.
 * 3. Different merchants with identical product/price remain separate.
 * 4. BestOffer selects one winner while allOffers preserves every eligible offer.
 * 5. Conflicting Gemini identity cannot replace page identity.
 * 6. Discovery budget can select up to 4 distinct queries.
 *
 * ZERO network calls.
 */

const samplePixelPageProduct: ProductIntelligence = {
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
    detectedAt: Date.now()
  },
};

const mock40RawPixelResults: RawProductResult[] = [
  // 10 legitimate Pixel 10a offers across distinct merchants
  { title: "Google Pixel 10a (256 GB, 8 GB RAM) Obsidian", price: 54599, currency: "INR", source: "Amazon.in", url: "https://www.amazon.in/dp/B0PIXEL10A1" },
  { title: "Google Pixel 10a 5G 256GB Obsidian", price: 55999, currency: "INR", source: "Flipkart", url: "https://www.flipkart.com/pixel-10a/p/itm123" },
  { title: "Google Pixel 10a 256GB Obsidian", price: 54999, currency: "INR", source: "Reliance Digital", url: "https://www.reliancedigital.in/pixel-10a/p/491" },
  { title: "Google Pixel 10a 5G 256GB", price: 55499, currency: "INR", source: "Croma", url: "https://www.croma.com/pixel-10a/p/271" },
  { title: "Google Pixel 10a 256GB Official", price: 54999, currency: "INR", source: "Google Store", url: "https://store.google.com/in/product/pixel_10a_buy" },
  { title: "Google Pixel 10a 5G 256GB Obsidian", price: 56499, currency: "INR", source: "Vijay Sales", url: "https://www.vijaysales.com/pixel-10a/p/88" },
  { title: "Google Pixel 10a 256GB", price: 54099, currency: "INR", source: "Zepto", url: "https://zepto.in/p/pixel-10a" },
  { title: "Google Pixel 10a 256GB 5G", price: 54685, currency: "INR", source: "MyG", url: "https://www.myg.in/pixel-10a.html" },
  { title: "Google Pixel 10a (256GB, 8GB RAM)", price: 54990, currency: "INR", source: "Tata CLiQ", url: "https://www.tatacliq.com/pixel-10a/p/33" },
  { title: "Google Pixel 10a 256GB Smartphone", price: 53999, currency: "INR", source: "Poorvika", url: "https://www.poorvika.com/pixel-10a" },

  // Duplicate offers to verify deduplication
  { title: "Google Pixel 10a (256 GB, 8 GB RAM) Obsidian", price: 54599, currency: "INR", source: "Amazon.in", url: "https://www.amazon.in/dp/B0PIXEL10A1?tag=affil" },
  { title: "Google Pixel 10a 256GB", price: 54099, currency: "INR", source: "Zepto", url: "https://zepto.in/p/pixel-10a?utm_source=serper" },

  // Ineligible accessories
  { title: "Google Pixel 10a Shockproof Protective Case Cover", price: 499, currency: "INR", source: "Amazon.in", url: "https://www.amazon.in/dp/B0CASE" },
  { title: "Tempered Glass Screen Protector for Google Pixel 10a", price: 299, currency: "INR", source: "Flipkart", url: "https://www.flipkart.com/glass/p/1" },
  { title: "Google Pixel 10a 30W USB-C Fast Charger Adapter", price: 1499, currency: "INR", source: "Croma", url: "https://www.croma.com/charger/p/2" },

  // Ineligible replacement parts
  { title: "Google Pixel 10a 5G Battery - ORIGINAL Replacement", price: 1800, currency: "INR", source: "Cellspare", url: "https://cellspare.com/pixel-10a-battery" },
  { title: "Google Pixel 10a LCD Screen Display Assembly Replacement", price: 4500, currency: "INR", source: "Maxbhi", url: "https://maxbhi.com/pixel-10a-lcd" },

  // Wrong generation devices
  { title: "Google Pixel 9a (128GB, 8GB RAM)", price: 42999, currency: "INR", source: "Amazon.in", url: "https://www.amazon.in/dp/B0PIXEL9A" },
  { title: "Google Pixel 10 Pro 5G (256GB)", price: 79999, currency: "INR", source: "Flipkart", url: "https://www.flipkart.com/pixel-10-pro/p/4" },
];

describe("Phase 4.9 — Runtime Offer Funnel & Offer Retention Tests", () => {
  // Test 1: 10 merchant offers remain separate after canonical matching.
  test("1. 10 merchant offers remain separate after canonical matching", () => {
    const mapped = processSearchResults(mock40RawPixelResults);
    const deduped = ensureMerchantCoverage(mapped);
    const identity = matchCandidates(samplePixelPageProduct, deduped);

    // The primary identity must contain the page product + all 10 matching merchant offers
    expect(identity.products.length).toBeGreaterThanOrEqual(10);

    const merchants = identity.products.map(p => p.metadata?.marketplace);
    expect(merchants).toContain("Amazon");
    expect(merchants).toContain("Flipkart");
    expect(merchants).toContain("Reliance Digital");
    expect(merchants).toContain("Croma");
    expect(merchants).toContain("Google Store");
    expect(merchants).toContain("Vijay Sales");
    expect(merchants).toContain("Zepto");
    expect(merchants).toContain("MyG");
    expect(merchants).toContain("Tata CLiQ");
    expect(merchants).toContain("Poorvika");
  });

  // Test 2: Accessories and replacement parts are removed while legitimate Pixel 10a offers remain.
  test("2. Accessories and replacement parts are removed while legitimate Pixel 10a offers remain", () => {
    const mapped = processSearchResults(mock40RawPixelResults);

    const titles = mapped.map(p => (p.originalTitle || "").toLowerCase());
    expect(titles.some(t => t.includes("case cover"))).toBe(false);
    expect(titles.some(t => t.includes("tempered glass"))).toBe(false);
    expect(titles.some(t => t.includes("fast charger"))).toBe(false);
    expect(titles.some(t => t.includes("battery - original"))).toBe(false);
    expect(titles.some(t => t.includes("screen display assembly"))).toBe(false);

    // Legitimate Pixel 10a with battery specification should pass
    const phoneWithBatterySpec: ProductIntelligence = {
      ...samplePixelPageProduct,
      originalTitle: "Google Pixel 10a 256GB with 5100mAh battery",
      normalizedTitle: "google pixel 10a 256gb with 5100mah battery",
    };
    const quality = classifyCandidateQuality(phoneWithBatterySpec);
    expect(quality.isEligibleProduct).toBe(true);
  });

  // Test 3: Different merchants with identical product/price remain separate.
  test("3. Different merchants with identical product and price remain separate", () => {
    const samePriceCandidates: ProductIntelligence[] = [
      {
        ...samplePixelPageProduct,
        originalPrice: 54999,
        originalUrl: "https://www.reliancedigital.in/pixel-10a",
        metadata: { ...samplePixelPageProduct.metadata, marketplace: "Reliance Digital", hostname: "reliancedigital.in", detectedAt: Date.now() },
      },
      {
        ...samplePixelPageProduct,
        originalPrice: 54999,
        originalUrl: "https://store.google.com/in/pixel-10a",
        metadata: { ...samplePixelPageProduct.metadata, marketplace: "Google Store", hostname: "store.google.com", detectedAt: Date.now() },
      },
    ];

    const result = ensureMerchantCoverage(samePriceCandidates);
    expect(result).toHaveLength(2);
    const m = result.map(c => c.metadata?.marketplace);
    expect(m).toContain("Reliance Digital");
    expect(m).toContain("Google Store");
  });

  // Test 4: BestOffer selects one winner while allOffers preserves every eligible offer.
  test("4. BestOffer selects one winner while allOffers preserves every eligible offer", () => {
    const mapped = processSearchResults(mock40RawPixelResults);
    const deduped = ensureMerchantCoverage(mapped);
    const identity = matchCandidates(samplePixelPageProduct, deduped);

    const candidates = identity.products.map(p => ({
      product: p,
      isCurrentProduct: p.originalUrl === samplePixelPageProduct.originalUrl,
      variantState: "explicitly_matching" as const,
      isRefurbishedOrUsed: false,
      isUnavailable: false,
      currencyMismatch: false,
      marketplaceReliabilityScore: p.metadata?.marketplace === "Amazon" || p.metadata?.marketplace === "Google Store" ? 90 : 80,
      qualityScore: 85,
      priceAvailabilityScore: 80,
      finalRankingScore: 85,
      identityConfidenceScore: 90,
      duplicateRedundancyScore: 0,
    }));

    const req = {
      ...buildRecommendationRequest(samplePixelPageProduct.normalizedTitle || ""),
      candidates,
    };

    const recResult = buildExplainableRecommendation(req, candidates);

    // Exactly 1 bestOffer selected
    expect(recResult.bestOffer).toBeDefined();
    expect(recResult.bestOffer?.product).toBeDefined();

    // allOffers preserves all eligible offers
    expect(recResult.allOffers).toBeDefined();
    expect(recResult.allOffers!.length).toBeGreaterThanOrEqual(10);
  });

  // Test 5: Conflicting Gemini identity cannot replace page identity.
  test("5. Conflicting Gemini identity cannot replace page identity", () => {
    const conflictingGeminiResult = {
      brand: "Samsung / Google",
      model: "Galaxy S25 FE / Pixel 9a",
      category: "Electronics > Communications > Telephony > Mobile Phones",
      productType: "Mobile Phone",
      confidence: 0.55,
      status: "partially_recognized" as const,
      visualAttributes: {},
      evidence: []
    };

    const pageIdentity = {
      brand: "Google",
      model: "Pixel 10a",
      category: "Smartphones",
      title: "Google Pixel 10a (Obsidian, 256GB)",
    };

    const reconciliation = reconcileVisualIdentity(conflictingGeminiResult as any, pageIdentity);

    // Reconciled identity must enforce page authority
    expect(reconciliation.status).toBe("conflicting");
    expect(reconciliation.resolvedBrand).toBe("Google");
    expect(reconciliation.resolvedModel).toBe("Pixel 10a");
  });

  // Test 6: Discovery budget can select up to 4 distinct queries and does not remain stuck at single-search mode.
  test("6. Discovery budget selects up to 4 distinct queries and does not stick to single query", async () => {
    const searchCalls: SearchRequest[] = [];
    const mockProvider: SearchProvider = {
      name: "mock-serper",
      async search(request: SearchRequest): Promise<SearchResponse> {
        searchCalls.push(request);
        return {
          query: request.query,
          products: [
            { title: "Google Pixel 10a 256GB", price: 54599, currency: "INR", source: "Amazon", url: "https://amazon.in/p1" },
          ],
          provider: "mock-serper",
          searchedAt: new Date().toISOString(),
        };
      },
    };

    const engine = new DiscoveryEngine(mockProvider);
    const input: SearchQueryInput = {
      title: "Google Pixel 10a (Obsidian, 256GB)",
      brand: "Google",
      model: "Pixel 10a",
      category: "Smartphones",
      attributes: {
        storage: "256GB",
        ram: "8GB",
        color: "Obsidian",
      },
    };

    const discovery = await engine.discover(input);

    // Budget allows up to MAX_SEARCH_QUERIES_PER_ANALYSIS = 4 queries
    expect(MAX_SEARCH_QUERIES_PER_ANALYSIS).toBe(4);
    expect(searchCalls.length).toBeGreaterThanOrEqual(2);
    expect(searchCalls.length).toBeLessThanOrEqual(4);
    expect(discovery.candidates.length).toBeGreaterThan(0);
  });
});
