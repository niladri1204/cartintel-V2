import { describe, test, expect } from "vitest";
import { processProduct } from "../engine";
import { inferCategoryAndType } from "../category";
import { inferDomain, ProductDomain } from "../domain";
import { compareProducts } from "../matching";
import { evaluateProductLevelDecisions } from "../decision/productDecision";
import { evaluateOfferLevelDecisions } from "../decision/offerDecision";
import { identifyAlternativeProducts } from "../decision/alternativeProduct";
import { rankAlternativeProducts } from "../decision/alternativeRanking";
import type { RecommendationCandidate, RecommendationRequest } from "../recommendationTypes";

describe("Phase 4.5.8 — Determinism, Immutability & Regression Gate", () => {

  function createCandidate(
    title: string,
    price: number,
    hostname: string,
    marketplace: string,
    url: string
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
      identityConfidenceScore: 90,
      rankingDetails: {
        finalScore: 90,
        rankingTier: "exact_identity_tier",
        contributions: {
          identityContribution: 50,
          qualityContribution: 20,
          priceAvailabilityContribution: 10,
          priceCompetitivenessContribution: 10,
          marketplaceContribution: 0,
          duplicatePenalty: 0
        },
        duplicatePenalty: 0,
        priceCompetitivenessScore: 100,
        explanation: "valid"
      }
    };
  }

  // =========================================================================
  // 1. DETERMINISTIC REPEATED EXECUTION
  // =========================================================================
  test("1. Deterministic repeated execution: 10 consecutive runs yield identical outputs", () => {
    const title = "Samsung Galaxy S24 Ultra 5G (12GB RAM, 256GB Storage) Titanium Gray";
    const candTitle = "Samsung Galaxy S24 Ultra 256GB Titanium Gray";

    const p1 = processProduct({ title, price: 129999, currency: "INR", image: null, url: "https://amazon.in/p", hostname: "amazon.in" });
    const p2 = processProduct({ title: candTitle, price: 124999, currency: "INR", image: null, url: "https://croma.com/p", hostname: "croma.com" });

    const baselineMatch = compareProducts(p1, p2);
    const baselineMatchJson = JSON.stringify(baselineMatch);

    for (let i = 0; i < 10; i++) {
      const match = compareProducts(p1, p2);
      expect(JSON.stringify(match)).toBe(baselineMatchJson);
    }

    const req: RecommendationRequest & { pageProduct?: any } = {
      productContext: { currentProduct: p1 },
      pageProduct: p1,
      candidates: [
        createCandidate(title, 129999, "amazon.in", "Amazon", "https://amazon.in/p"),
        createCandidate(candTitle, 124999, "croma.com", "Croma", "https://croma.com/p")
      ],
      userPreferences: null
    };

    const baselineProdDec = evaluateProductLevelDecisions(req);
    const baselineProdDecJson = JSON.stringify(baselineProdDec);

    for (let i = 0; i < 10; i++) {
      const dec = evaluateProductLevelDecisions(req);
      expect(JSON.stringify(dec)).toBe(baselineProdDecJson);
    }
  });

  // =========================================================================
  // 2. INPUT IMMUTABILITY
  // =========================================================================
  test("2. Input immutability: request and candidate objects remain unmodified after engine execution", () => {
    const p1 = processProduct({ title: "Puma Electron Street Black Running Shoes UK 9", price: 3499, currency: "INR", image: null, url: "https://puma.com/p", hostname: "puma.com" });
    const c1 = createCandidate("Puma Electron Street Black Running Shoes UK 9", 3199, "amazon.in", "Amazon", "https://amazon.in/p");

    const p1Clone = JSON.parse(JSON.stringify(p1));
    const c1Clone = JSON.parse(JSON.stringify(c1));

    const req: RecommendationRequest & { pageProduct?: any } = {
      productContext: { currentProduct: p1 },
      pageProduct: p1,
      candidates: [c1],
      userPreferences: null
    };
    const reqClone = JSON.parse(JSON.stringify(req));

    evaluateProductLevelDecisions(req);
    evaluateOfferLevelDecisions(req, null);
    identifyAlternativeProducts(req);
    rankAlternativeProducts(req);

    expect(JSON.stringify(p1)).toBe(JSON.stringify(p1Clone));
    expect(JSON.stringify(c1)).toBe(JSON.stringify(c1Clone));
    expect(JSON.stringify(req)).toBe(JSON.stringify(reqClone));
  });

  // =========================================================================
  // 3. NO GLOBAL STATE LEAKAGE
  // =========================================================================
  test("3. No global state leakage between sequential processing of different domains", () => {
    const pElectronics = processProduct({ title: "Samsung Galaxy S24 256GB", price: 79999, currency: "INR", image: null, url: "https://amazon.in/p", hostname: "amazon.in" });
    const pFashion = processProduct({ title: "H&M Regular Fit Cotton T-Shirt Size M", price: 799, currency: "INR", image: null, url: "https://hm.com/p", hostname: "hm.com" });

    const electronicsReq: RecommendationRequest & { pageProduct?: any } = {
      productContext: { currentProduct: pElectronics },
      pageProduct: pElectronics,
      candidates: [],
      userPreferences: null
    };

    const fashionReq: RecommendationRequest & { pageProduct?: any } = {
      productContext: { currentProduct: pFashion },
      pageProduct: pFashion,
      candidates: [],
      userPreferences: null
    };

    const decElec = evaluateProductLevelDecisions(electronicsReq);
    expect(decElec.request.productContext?.currentProduct?.domain || decElec.request.pageProduct?.domain).toBe(ProductDomain.Electronics);

    const decFash = evaluateProductLevelDecisions(fashionReq);
    expect(decFash.request.productContext?.currentProduct?.domain || decFash.request.pageProduct?.domain).toBe(ProductDomain.Fashion);

    // Verify no cross-domain residue remains in electronics request after running fashion request
    expect(electronicsReq.pageProduct?.domain).toBe(ProductDomain.Electronics);
    expect(electronicsReq.pageProduct?.brand).toBe("samsung");
  });

  // =========================================================================
  // 4. CROSS-DOMAIN REGRESSION PROTECTION ACROSS ALL 7 DOMAINS
  // =========================================================================
  test("4. Cross-domain regression protection across all 7 domains", () => {
    const domainSamples = [
      { title: "Samsung Galaxy S24 Ultra 5G", expectedDomain: ProductDomain.Electronics, expectedCategory: "Electronics" },
      { title: "Nike Air Max Excee Running Shoes UK 9", expectedDomain: ProductDomain.Fashion, expectedCategory: "Fashion" },
      { title: "H&M Regular Fit Cotton T-Shirt Size M", expectedDomain: ProductDomain.Fashion, expectedCategory: "Fashion" },
      { title: "The Ordinary Niacinamide 10% + Zinc 1% Serum 30ml", expectedDomain: ProductDomain.Beauty, expectedCategory: "Beauty & Personal Care" },
      { title: "Nescafe Gold Instant Coffee 200g", expectedDomain: ProductDomain.Grocery, expectedCategory: "Grocery" },
      { title: "IKEA 3 Seater Fabric Sofa Brown 180x80x75 cm", expectedDomain: ProductDomain.Furniture, expectedCategory: "Furniture" },
      { title: "Atomic Habits by James Clear Paperback Book ISBN 9780735211292", expectedDomain: ProductDomain.Books, expectedCategory: "Books" }
    ];

    for (const sample of domainSamples) {
      const prod = processProduct({ title: sample.title, price: 1000, currency: "INR", image: null, url: "https://example.com/p", hostname: "example.com" });
      expect(prod.domain).toBe(sample.expectedDomain);
      expect(prod.category).toBe(sample.expectedCategory);
      const expectedMinConfidence = sample.expectedDomain === ProductDomain.Books ? 50 : 70;
      expect(prod.confidence).toBeGreaterThanOrEqual(expectedMinConfidence);
    }
  });
});
