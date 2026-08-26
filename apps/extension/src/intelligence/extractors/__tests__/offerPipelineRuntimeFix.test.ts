import { describe, test, expect } from "vitest";
import { classifyCandidateQuality } from "../../candidateQuality";
import { processSearchResults } from "../../../services/search/mapper";
import { SerpApiGoogleShoppingProvider } from "../../../../../web/server/services/search/providers/SerpApiGoogleShoppingProvider";
import { SearchService } from "../../../services/search/index";
import { evaluateOfferLevelDecisions } from "../../decision/offerDecision";
import type { ProductIntelligence } from "../../types";
import type { RecommendationRequest, RecommendationCandidate } from "../../recommendationTypes";
import type { ProductDecisionGroup } from "../../decision/decisionTypes";

describe("Phase 4.6 — Runtime Pipeline Unification & Merchant/Offer Correction Tests", () => {
  // Test 1: Battery/replacement-part candidate is classified ineligible.
  test("1. Battery/replacement-part candidate classified ineligible", () => {
    const batteryProd: ProductIntelligence = {
      originalTitle: "OnePlus 15R 5G Battery - ORIGINAL",
      normalizedTitle: "oneplus 15r 5g battery original",
      originalPrice: 1200,
      originalCurrency: "INR",
      brand: "OnePlus",
      model: "15R",
      category: "Mobile Phones",
      confidence: 90,
      fingerprint: "oneplus|15r"
    };

    const quality = classifyCandidateQuality(batteryProd);
    expect(quality.isEligibleProduct).toBe(false);
    expect(quality.status).toBe("replacement_part");
  });

  // Test 2: Case cover is classified ineligible as accessory.
  test("2. Case cover candidate classified ineligible", () => {
    const caseCoverProd: ProductIntelligence = {
      originalTitle: "OnePlus 15R Premium Matte Silicone Back Case Cover",
      normalizedTitle: "oneplus 15r premium matte silicone back case cover",
      originalPrice: 399,
      originalCurrency: "INR",
      brand: "OnePlus",
      model: "15R",
      category: "Mobile Phones",
      confidence: 90,
      fingerprint: "oneplus|15r"
    };

    const quality = classifyCandidateQuality(caseCoverProd);
    expect(quality.isEligibleProduct).toBe(false);
    expect(quality.status).toBe("accessory");
  });

  // Test 3: Multiple unique merchant offers survive deduplication.
  test("3. Multiple unique merchant offers survive deduplication", () => {
    const rawAmazon = {
      title: "OnePlus 15R (5G, 256GB)",
      price: 59999,
      currency: "INR",
      source: "Amazon",
      marketplace: "Amazon",
      url: "https://amazon.in/dp/123"
    };
    const rawZepto = {
      title: "OnePlus 15R (5G, 256GB)",
      price: 54099,
      currency: "INR",
      source: "Zepto",
      marketplace: "Zepto",
      url: "https://zepto.in/p/456"
    };

    const processed = processSearchResults([rawAmazon, rawZepto]);
    expect(processed).toHaveLength(2);
    expect(processed[0]?.metadata?.marketplace).toBe("Amazon");
    expect(processed[1]?.metadata?.marketplace).toBe("Zepto");
  });

  // Test 4: Google.co.in redirect URL correctly resolves to the merchant destination.
  test("4. Google.co.in redirect URL correctly resolves to the merchant destination", () => {
    const provider = new SerpApiGoogleShoppingProvider();

    const googleCoInUrl = "https://www.google.co.in/url?url=https://www.flipkart.com/oneplus-15r/p/itm123";
    const resolvedUrl = (provider as any).extractDirectMerchantUrl(googleCoInUrl, undefined);

    expect(resolvedUrl).toBe("https://www.flipkart.com/oneplus-15r/p/itm123");
  });

  // Test 5: Seller-expansion fields survive SearchRequest -> backend payload mapping.
  test("5. Seller-expansion fields survive SearchRequest mapping", () => {
    const service = new SearchService();
    const prod: ProductIntelligence = {
      originalTitle: "OnePlus 15R",
      normalizedTitle: "oneplus 15r",
      originalPrice: 54099,
      originalCurrency: "INR",
      brand: "OnePlus",
      model: "15R",
      category: "Smartphones",
      confidence: 90,
      fingerprint: "oneplus|15r",
      metadata: {
        marketplace: "Amazon",
        hostname: "amazon.in",
        detectedAt: Date.now(),
        googleProductId: "gprod_123",
        googleImmersiveToken: "token_456"
      }
    };
    (prod as any).useSellerExpansion = true;

    const req = (service as any).buildRequest(prod);

    expect(req.googleProductId).toBe("gprod_123");
    expect(req.googleImmersiveToken).toBe("token_456");
    expect(req.useSellerExpansion).toBe(true);
  });

  // Test 6: Decision-aware bestOffer/cheapestOffer does not automatically select current-page Amazon offer when another eligible trusted offer (Zepto) is cheaper.
  test("6. Decision-aware bestOffer selects cheaper trusted offer over current-page Amazon offer", () => {
    const request: RecommendationRequest = {
      candidates: []
    };

    const candAmazonCurrentPage: RecommendationCandidate = {
      product: {
        originalTitle: "OnePlus 15R 256GB",
        originalPrice: 59999,
        originalCurrency: "INR",
        brand: "OnePlus",
        model: "15R",
        category: "Electronics",
        fingerprint: "oneplus|15r"
      },
      isCurrentProduct: true,
      variantState: "explicitly_matching",
      isRefurbishedOrUsed: false,
      isUnavailable: false,
      currencyMismatch: false,
      identityConfidenceScore: 90,
      duplicateRedundancyScore: 0,
      marketplaceReliabilityScore: 95,
      finalRankingScore: 90,
      qualityScore: 85,
      priceAvailabilityScore: 95
    };

    const candZeptoCheaper: RecommendationCandidate = {
      product: {
        originalTitle: "OnePlus 15R 256GB",
        originalPrice: 54099,
        originalCurrency: "INR",
        brand: "OnePlus",
        model: "15R",
        category: "Electronics",
        fingerprint: "oneplus|15r"
      },
      isCurrentProduct: false,
      variantState: "explicitly_matching",
      isRefurbishedOrUsed: false,
      isUnavailable: false,
      currencyMismatch: false,
      identityConfidenceScore: 90,
      duplicateRedundancyScore: 0,
      marketplaceReliabilityScore: 90,
      finalRankingScore: 85,
      qualityScore: 80,
      priceAvailabilityScore: 95
    };

    const productGroup = {
      fingerprint: "oneplus|15r",
      offers: [candAmazonCurrentPage, candZeptoCheaper]
    } as any as ProductDecisionGroup;

    const res = evaluateOfferLevelDecisions(request, productGroup);

    expect(res.cheapestOffer).toBe(candZeptoCheaper);
    expect(res.bestOffer).toBe(candZeptoCheaper);
  });
});
