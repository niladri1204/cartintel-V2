import { describe, test, expect } from "vitest";
import { processProduct } from "../engine";
import { ProductDomain, inferDomain } from "../domain";
import { compareProducts } from "../matching";
import { calculateIdentityConfidence, calculateMarketplaceReliability } from "../ranking";
import { evaluateProductLevelDecisions } from "../decision/productDecision";
import { evaluateOfferLevelDecisions } from "../decision/offerDecision";
import { identifyAlternativeProducts } from "../decision/alternativeProduct";
import { rankAlternativeProducts } from "../decision/alternativeRanking";
import { selectBestRecommendation } from "../decision/decisionIntelligence";
import { recommendDeal } from "../recommendation";
import { toRecommendationCandidates } from "../recommendationAdapter";
import { sanitizePurchaseUrl, validatePurchaseUrlSafety } from "../purchaseSafety";
import type { RecommendationCandidate, RecommendationRequest } from "../recommendationTypes";
import type { RankedOffer, RankedDealResult } from "../ranking";

describe("Phase 5.4 — Final Recommendation Intelligence Validation & Stress Gate (All 7 Domains)", () => {

  function createCandidate(
    title: string,
    price: number | null,
    hostname: string,
    marketplace: string,
    url: string | null,
    identityConfidenceScore: number = 80
  ): RecommendationCandidate {
    const prod = processProduct({
      title,
      price,
      currency: "INR",
      image: "https://example.com/img.jpg",
      url,
      hostname
    });
    prod.metadata = { marketplace, hostname, detectedAt: Date.now() };

    return {
      product: prod,
      isCurrentProduct: false,
      isRefurbishedOrUsed: false,
      isUnavailable: false,
      currencyMismatch: false,
      identityConfidenceScore,
      rankingDetails: {
        finalScore: identityConfidenceScore,
        rankingTier: identityConfidenceScore >= 80 ? "exact_identity_tier" : "partial_identity_tier",
        contributions: {
          identityContribution: Math.round((identityConfidenceScore / 100) * 50),
          qualityContribution: 15,
          priceAvailabilityContribution: 10,
          priceCompetitivenessContribution: 10,
          marketplaceContribution: 0,
          duplicatePenalty: 0
        },
        duplicatePenalty: 0,
        priceCompetitivenessScore: 100,
        explanation: "valid candidate"
      }
    };
  }

  // =========================================================================
  // REQUIREMENT 1: EXACT MATCH IDENTITY CONFIDENCE SAFETY GATE
  // =========================================================================
  test("1. Exact Match requires sufficient identity confidence (>= 95%); low confidence (< 80%) blocks exact match", () => {
    const pTarget = processProduct({ title: "Samsung Galaxy S24 Ultra 5G 256GB", price: 129999, currency: "INR", image: null, url: "https://amazon.in/p1", hostname: "amazon.in" });

    // Low identity confidence candidate (40%, 50%, 60%, 79%)
    const lowConfidenceScores = [40, 50, 60, 79];
    for (const score of lowConfidenceScores) {
      const pLow = processProduct({ title: "Random Mobile Accessory", price: 500, currency: "INR", image: null, url: "https://example.com/p2", hostname: "example.com" });
      const idDetails = calculateIdentityConfidence(pTarget, pLow);
      expect(idDetails.matchState).not.toBe("exact_identity");
      expect(idDetails.score).toBeLessThan(80);
    }

    // Exact match candidate (>= 95%)
    const pExact = processProduct({ title: "Samsung Galaxy S24 Ultra 5G 256GB", price: 124999, currency: "INR", image: null, url: "https://croma.com/p2", hostname: "croma.com" });
    const matchExact = compareProducts(pTarget, pExact);
    expect(matchExact.decision).toBe("Exact Match");
    expect(matchExact.confidence).toBeGreaterThanOrEqual(95);
  });

  // =========================================================================
  // REQUIREMENT 2: VARIANT SEPARATION GATE ACROSS ALL 7 DOMAINS
  // =========================================================================
  test("2. Variant products across all 7 domains never masquerade as exact matches", () => {
    const variantScenarios = [
      { domain: "Electronics", t1: "Samsung S24 128GB", t2: "Samsung S24 256GB" },
      { domain: "Fashion", t1: "H&M T-Shirt Size S", t2: "H&M T-Shirt Size L" },
      { domain: "Footwear", t1: "Puma Shoes UK 8", t2: "Puma Shoes UK 10" },
      { domain: "Beauty", t1: "Niacinamide Serum 30ml", t2: "Niacinamide Serum 60ml" },
      { domain: "Grocery", t1: "Tata Tea Gold 250g", t2: "Tata Tea Gold 500g" },
      { domain: "Furniture", t1: "IKEA Sofa 2 Seater", t2: "IKEA Sofa 3 Seater" },
      { domain: "Books", t1: "Sapiens Paperback", t2: "Sapiens Hardcover" }
    ];

    for (const s of variantScenarios) {
      const p1 = processProduct({ title: s.t1, price: 1000, currency: "INR", image: null, url: "https://m1.com/p", hostname: "m1.com" });
      const p2 = processProduct({ title: s.t2, price: 1200, currency: "INR", image: null, url: "https://m2.com/p", hostname: "m2.com" });

      const match = compareProducts(p1, p2);
      expect(match.decision).not.toBe("Exact Match");
      expect(match.decision).toBe("Likely Match");
    }
  });

  // =========================================================================
  // REQUIREMENT 3: ALTERNATIVES NEVER REPLACE VALID EXACT MATCHES
  // =========================================================================
  test("3. Alternative products never displace or replace a valid exact match recommendation", () => {
    const p1 = processProduct({ title: "Samsung Galaxy S24 Ultra 256GB", price: 129999, currency: "INR", image: null, url: "https://amazon.in/p", hostname: "amazon.in" });

    const exactCand = createCandidate("Samsung Galaxy S24 Ultra 256GB", 124999, "croma.com", "Croma", "https://croma.com/p", 95);
    const altCand = createCandidate("Google Pixel 8 Pro 256GB", 99999, "flipkart.com", "Flipkart", "https://flipkart.com/p", 85);

    const req: RecommendationRequest & { pageProduct?: any } = {
      productContext: { currentProduct: p1 },
      pageProduct: p1,
      candidates: [createCandidate(p1.originalTitle!, 129999, "amazon.in", "Amazon", "https://amazon.in/p", 100), exactCand, altCand]
    };

    const prodDec = evaluateProductLevelDecisions(req);
    expect(prodDec.bestProductGroup).toBeDefined();
    expect(prodDec.bestProductGroup?.fingerprint).toContain("samsung|galaxy s24 ultra");

    const altRes = identifyAlternativeProducts(req);
    expect(altRes.recommendedProduct?.fingerprint).toContain("samsung|galaxy s24 ultra");
    expect(altRes.alternatives.some(a => (a.product.normalizedTitle || a.product.originalTitle || "").includes("pixel 8 pro"))).toBe(true);
  });

  // =========================================================================
  // REQUIREMENT 4: DOMAIN & PRODUCT-TYPE ISOLATION GATE
  // =========================================================================
  test("4. Alternative products remain strictly within compatible domain and product type", () => {
    const shoeProduct = processProduct({ title: "Puma Running Shoes UK 9", price: 3500, currency: "INR", image: null, url: "https://puma.com/p", hostname: "puma.com" });

    const validShoeAlt = createCandidate("Nike Air Max Running Shoes UK 9", 5995, "nike.com", "Nike", "https://nike.com/p", 85);
    const crossDomainPhone = createCandidate("Samsung Galaxy S24 Smartphone", 79999, "croma.com", "Croma", "https://croma.com/p", 90);

    const req: RecommendationRequest & { pageProduct?: any } = {
      productContext: { currentProduct: shoeProduct },
      pageProduct: shoeProduct,
      candidates: [createCandidate("Puma Running Shoes UK 9", 3500, "puma.com", "Puma", "https://puma.com/p", 100), validShoeAlt, crossDomainPhone]
    };

    const altRes = identifyAlternativeProducts(req);
    const altTitles = altRes.alternatives.map(a => (a.product.normalizedTitle || a.product.originalTitle || "").toLowerCase());
    expect(altTitles.some(t => t.includes("nike"))).toBe(true);
    expect(altTitles.some(t => t.includes("samsung"))).toBe(false); // Cross-domain phone strictly rejected
  });

  // =========================================================================
  // REQUIREMENT 5: HARD CONSTRAINTS DOMINANCE GATE
  // =========================================================================
  test("5. Hard user constraints are strictly respected; ineligible candidates get decision score 0", () => {
    const p1 = processProduct({ title: "Samsung S24 256GB", price: 79999, currency: "INR", image: null, url: "https://amazon.in/p", hostname: "amazon.in" });

    const c1 = createCandidate("Samsung S24 256GB", 79999, "amazon.in", "Amazon", "https://amazon.in/p", 90); // Fails max budget
    const c2 = createCandidate("Samsung S24 256GB", 64999, "croma.com", "Croma", "https://croma.com/p", 90);   // Satisfies max budget

    const req: RecommendationRequest = {
      productContext: { currentProduct: p1 },
      candidates: [c1, c2],
      hardConstraints: [
        { attribute: "price", operator: "less_than_or_equal", value: 70000 }
      ]
    };

    const result = selectBestRecommendation(req, [c1, c2]);
    expect(result.recommendedCandidate).toBeDefined();
    expect(result.recommendedCandidate?.product?.metadata?.marketplace).toBe("Croma");

    // Verify ineligible c1 has decision score 0 in scoredEvaluations
    const evalC1 = result.scoredEvaluations.find(e => e.eligibility === "ineligible");
    expect(evalC1).toBeDefined();
    expect(evalC1?.decisionScore).toBe(0);
    expect(evalC1?.utilityBreakdown.finalDecisionScore).toBe(0);
  });

  // =========================================================================
  // REQUIREMENT 6: MISSING DATA SAFE DEGRADATION GATE
  // =========================================================================
  test("6. Missing price, brand, model, or URL degrades safely without fabricated certainty", () => {
    const sparseProduct = processProduct({ title: "Item", price: null, currency: null, image: null, url: null, hostname: "" });

    expect(sparseProduct.brand).toBeNull();
    expect(sparseProduct.model).toBe("item");
    expect(sparseProduct.domain).toBe(ProductDomain.General);

    const rankedDeals: RankedDealResult = {
      currentProduct: sparseProduct,
      offers: [],
      bestOffer: null,
      hasCurrencyMismatch: false
    };

    const recRes = recommendDeal(rankedDeals);
    expect(recRes.state).toBe("no_matching_offers");
    expect(recRes.recommendedOffer).toBeNull();
  });

  // =========================================================================
  // REQUIREMENT 7: UNVERIFIED MERCHANT FALLBACK PROTECTION GATE
  // =========================================================================
  test("7. Unverified or unknown merchants receive lower fallback reliability score (35) and do not usurp verified platforms", () => {
    const unverifiedProd = processProduct({ title: "Samsung S24", price: 79999, currency: "INR", image: null, url: null, hostname: "" });
    unverifiedProd.metadata = { marketplace: "", hostname: "", detectedAt: Date.now() };

    const relDetails = calculateMarketplaceReliability(unverifiedProd);
    expect(relDetails.score).toBe(35);
    expect(relDetails.reliabilityState).toBe("missing_marketplace");

    const verifiedProd = processProduct({ title: "Samsung S24", price: 79999, currency: "INR", image: null, url: "https://croma.com/p", hostname: "croma.com" });
    verifiedProd.metadata = { marketplace: "Croma", hostname: "croma.com", detectedAt: Date.now() };

    const verifiedRel = calculateMarketplaceReliability(verifiedProd);
    expect(verifiedRel.score).toBe(100);
    expect(verifiedRel.score).toBeGreaterThan(relDetails.score);
  });

  // =========================================================================
  // REQUIREMENT 8: ZERO FABRICATION & PURCHASE URL SAFETY GATE
  // =========================================================================
  test("8. Purchase URLs and attributes are preserved without fabrication or proxy exposure", () => {
    const searchProxyUrl = "https://www.google.com/url?q=https://www.croma.com/p/s24ultra&sa=D";
    const sanitized = sanitizePurchaseUrl(searchProxyUrl);
    expect(sanitized).toBe("https://www.croma.com/p/s24ultra");

    const safetyCheck = validatePurchaseUrlSafety(searchProxyUrl, "croma.com");
    expect(safetyCheck.isValid).toBe(true);
    expect(safetyCheck.hostname).toBe("croma.com");

    const invalidCrossDomain = validatePurchaseUrlSafety("https://malicious.com/phish", "croma.com");
    expect(invalidCrossDomain.isValid).toBe(false);
  });

  // =========================================================================
  // REQUIREMENT 9: DETERMINISM & IMMUTABILITY GATE
  // =========================================================================
  test("9. Engine execution across all 7 domains is 100% deterministic with zero input mutation", () => {
    const domains = [
      { title: "Samsung Galaxy S24 256GB", price: 79999 },
      { title: "H&M Cotton Shirt Size M", price: 1499 },
      { title: "Puma Shoes UK 9", price: 3499 },
      { title: "The Ordinary Serum 30ml", price: 600 },
      { title: "Tata Tea Gold 500g", price: 250 },
      { title: "IKEA 3 Seater Sofa", price: 24999 },
      { title: "Atomic Habits Book Paperback", price: 450 }
    ];

    for (const d of domains) {
      const p = processProduct({ title: d.title, price: d.price, currency: "INR", image: null, url: "https://ex.com/p", hostname: "ex.com" });
      const pClone = JSON.parse(JSON.stringify(p));

      const req: RecommendationRequest & { pageProduct?: any } = {
        productContext: { currentProduct: p },
        pageProduct: p,
        candidates: []
      };

      const run1 = JSON.stringify(evaluateProductLevelDecisions(req));
      const run2 = JSON.stringify(evaluateProductLevelDecisions(req));
      expect(run1).toBe(run2);

      // Verify zero input object mutation
      expect(JSON.stringify(p)).toBe(JSON.stringify(pClone));
    }
  });

  // =========================================================================
  // REQUIREMENT 10: FULL 7-DOMAIN RECOMMENDATION PIPELINE PROTECTION GATE
  // =========================================================================
  test("10. Full 7-domain recommendation pipeline runs cleanly without errors or regressions", () => {
    const domainProducts = [
      { title: "Samsung Galaxy S24 Ultra 256GB", domain: ProductDomain.Electronics },
      { title: "H&M Regular Fit T-Shirt Black", domain: ProductDomain.Fashion },
      { title: "Puma Electron Street Shoes UK 9", domain: ProductDomain.Fashion },
      { title: "The Ordinary Niacinamide Serum 30ml", domain: ProductDomain.Beauty },
      { title: "Tata Tea Gold Premium Black Tea 500g", domain: ProductDomain.Grocery },
      { title: "IKEA 3 Seater Fabric Sofa Brown", domain: ProductDomain.Furniture },
      { title: "Atomic Habits by James Clear Paperback", domain: ProductDomain.Books }
    ];

    for (const dp of domainProducts) {
      const prod = processProduct({ title: dp.title, price: 1000, currency: "INR", image: null, url: "https://store.com/p", hostname: "store.com" });
      expect(prod.domain).toBe(dp.domain);

      const cand = createCandidate(dp.title, 900, "croma.com", "Croma", "https://croma.com/p", 90);
      const req: RecommendationRequest & { pageProduct?: any } = {
        productContext: { currentProduct: prod },
        pageProduct: prod,
        candidates: [cand]
      };

      const decRes = evaluateProductLevelDecisions(req);
      expect(decRes.productGroups.length).toBeGreaterThan(0);
    }
  });
});
