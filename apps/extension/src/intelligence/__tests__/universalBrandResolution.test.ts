import { describe, test, expect } from "vitest";
import { resolveBrand, extractBrand, type BrandResolution } from "../brand";
import { parseProductTitle } from "../parser";
import { processProduct } from "../engine";
import { compareProducts } from "../matching";
import { evaluateProductLevelDecisions } from "../decision/productDecision";
import { evaluateOfferLevelDecisions } from "../decision/offerDecision";
import type { RecommendationCandidate, RecommendationRequest } from "../recommendationTypes";

describe("Phase 5.X — Universal Brand Resolution & Product Intelligence Comprehensive Suite (Tests A - L)", () => {
  // Test A — Unknown single-word beauty brand
  test("Test A: Unknown single-word beauty brand (MARS Candylicious Coloured Lip Balm)", () => {
    const res: BrandResolution = resolveBrand({
      structuredBrand: "MARS",
      title: "MARS Candylicious Coloured Lip Balm - 3.5g",
      url: "https://www.myntra.com/lip-balm/mars/candylicious-coloured-lip-balm/123/buy"
    });

    expect(res.brand).toBe("mars");
    expect(res.confidence).toBeGreaterThanOrEqual(95);
    expect(res.source).toBe("dom_structured");

    const intel = processProduct({
      title: "MARS Candylicious Coloured Lip Balm - 3.5g",
      brand: "MARS",
      price: 249,
      currency: "INR",
      image: null,
      url: "https://www.myntra.com/lip-balm/mars/candylicious-coloured-lip-balm/123/buy",
      hostname: "www.myntra.com"
    });

    expect(intel.brand).toBe("mars");
    expect(intel.category).toBe("Beauty & Personal Care");
    expect(intel.confidence).toBeGreaterThanOrEqual(95);
    expect(intel.model).toContain("candylicious coloured lip balm");
    expect(intel.fingerprint).toContain("mars|candylicious coloured lip balm");
  });

  // Test B — Unknown multi-word brand
  test("Test B: Unknown multi-word brand (Sugar Cosmetics Matte As Hell Crayon)", () => {
    const res = resolveBrand({
      title: "Sugar Cosmetics Matte As Hell Crayon Lipstick 2.8g"
    });

    expect(res.brand).toBe("sugar cosmetics");
    expect(res.confidence).toBeGreaterThanOrEqual(85);
  });

  // Test C — Structured brand contradicts title
  test("Test C: Structured brand contradicts title (DOM brand: MARS vs Title: Maybelline)", () => {
    const res = resolveBrand({
      structuredBrand: "MARS",
      title: "Maybelline Colossal Bold Liner 3ml"
    });

    expect(res.brand).toBe("mars");
    expect(res.confidence).toBeLessThanOrEqual(60);
    expect(res.evidence.some((e) => e.includes("Contradiction detected"))).toBe(true);

    const intel = processProduct({
      title: "Maybelline Colossal Bold Liner 3ml",
      brand: "MARS",
      price: 199,
      currency: "INR",
      image: null,
      url: "https://example.com/p1",
      hostname: "example.com"
    });

    // Contradiction pulls overall confidence down appropriately
    expect(intel.confidence).toBeLessThanOrEqual(75);
  });

  // Test D — JSON-LD only
  test("Test D: JSON-LD only brand resolution", () => {
    const res = resolveBrand({
      jsonLdBrand: "MARS",
      title: "Candylicious Coloured Lip Balm 3.5g"
    });

    expect(res.brand).toBe("mars");
    expect(res.confidence).toBeGreaterThanOrEqual(95);
    expect(res.source).toBe("jsonld");
  });

  // Test E — Title only
  test("Test E: Title only brand resolution without structured DOM/JSON-LD", () => {
    const res = resolveBrand({
      title: "MARS Candylicious Coloured Lip Balm"
    });

    expect(res.brand).toBe("mars");
    expect(res.source).toBe("title");
    expect(res.confidence).toBeGreaterThanOrEqual(80);
  });

  // Test F — Generic product (never falsely extract adjectives as brand)
  test("Test F: Generic product (Waterproof Black Kajal)", () => {
    const res = resolveBrand({
      title: "Waterproof Black Kajal 0.35g"
    });

    expect(res.brand).toBeNull();
    expect(res.confidence).toBe(0);
    expect(res.source).toBe("unresolved");
  });

  // Test G — Multi-word brand (The Derma Co)
  test("Test G: Multi-word brand (The Derma Co 1% Salicylic Acid Face Wash)", () => {
    const res = resolveBrand({
      title: "The Derma Co 1% Salicylic Acid Face Wash 100ml"
    });

    expect(res.brand).toBe("the derma co");
    expect(res.confidence).toBeGreaterThanOrEqual(90);
    expect(res.source).toBe("title");
  });

  // Test H — Existing known brands continue to work
  test("Test H: Existing known brands continue to work normally", () => {
    const knownCases = [
      { title: "Maybelline New York Colossal Bold Liner", expected: "maybelline" },
      { title: "Lakme Absolute Matte Melt Liquid Lip Color", expected: "lakme" },
      { title: "Nivea Men Dark Spot Reduction Face Wash", expected: "nivea" },
      { title: "Samsung Galaxy S24 Ultra 5G 256GB", expected: "samsung" },
      { title: "Apple iPhone 15 Pro Max 256GB", expected: "apple" },
      { title: "Sony WH-1000XM5 Wireless Headphones", expected: "sony" }
    ];

    for (const c of knownCases) {
      const res = resolveBrand({ title: c.title });
      expect(res.brand).toBe(c.expected);
      expect(res.confidence).toBeGreaterThanOrEqual(85);
    }
  });

  // Test I — Fingerprint consistency and isolation
  test("Test I: Fingerprint consistency and isolation", () => {
    const p1 = processProduct({
      title: "MARS Candylicious Coloured Lip Balm - 3.5g",
      brand: "MARS",
      price: 249,
      currency: "INR",
      image: null,
      url: "https://myntra.com/p1",
      hostname: "myntra.com"
    });

    const p2 = processProduct({
      title: "mars candylicious coloured lip balm 3.5 g",
      brand: "mars",
      price: 220,
      currency: "INR",
      image: null,
      url: "https://nykaa.com/p2",
      hostname: "nykaa.com"
    });

    const pDifferentBrand = processProduct({
      title: "Maybelline Candylicious Coloured Lip Balm",
      brand: "Maybelline",
      price: 249,
      currency: "INR",
      image: null,
      url: "https://myntra.com/p3",
      hostname: "myntra.com"
    });

    expect(p1.fingerprint).toBe(p2.fingerprint);
    expect(p1.fingerprint).not.toBe(pDifferentBrand.fingerprint);
  });

  // Test J — Cross-merchant matching
  test("Test J: Cross-merchant matching (Myntra + Nykaa + Amazon MARS listings cluster together)", () => {
    const myntra = processProduct({
      title: "MARS Candylicious Coloured Lip Balm - 3.5g",
      brand: "MARS",
      price: 249,
      currency: "INR",
      image: null,
      url: "https://myntra.com/p1",
      hostname: "myntra.com"
    });

    const nykaa = processProduct({
      title: "MARS Candylicious Coloured Lip Balm 3.5g",
      brand: "MARS",
      price: 199,
      currency: "INR",
      image: null,
      url: "https://nykaa.com/p2",
      hostname: "nykaa.com"
    });

    const amazon = processProduct({
      title: "MARS Candylicious Coloured Lip Balm (3.5g)",
      brand: "MARS",
      price: 189,
      currency: "INR",
      image: null,
      url: "https://amazon.in/p3",
      hostname: "amazon.in"
    });

    expect(compareProducts(myntra, nykaa).isMatch).toBe(true);
    expect(compareProducts(myntra, amazon).isMatch).toBe(true);
    expect(compareProducts(nykaa, amazon).isMatch).toBe(true);
  });

  // Test K — Wrong brand (MARS vs Maybelline) must never cluster
  test("Test K: Wrong brand (MARS vs Maybelline) must never match", () => {
    const mars = processProduct({
      title: "MARS Candylicious Coloured Lip Balm",
      brand: "MARS",
      price: 249,
      currency: "INR",
      image: null,
      url: "https://myntra.com/p1",
      hostname: "myntra.com"
    });

    const maybelline = processProduct({
      title: "Maybelline Candylicious Coloured Lip Balm",
      brand: "Maybelline",
      price: 199,
      currency: "INR",
      image: null,
      url: "https://nykaa.com/p2",
      hostname: "nykaa.com"
    });

    const match = compareProducts(mars, maybelline);
    expect(match.isMatch).toBe(false);
  });

  // Test L — Existing cheapest-offer regression (Unbiased cheapest offer selection)
  test("Test L: Cheapest offer regression (Amazon ₹329 wins over Myntra ₹399 and Nykaa ₹349)", () => {
    const currentProduct = processProduct({
      title: "MARS Candylicious Coloured Lip Balm - 3.5g",
      brand: "MARS",
      price: 399,
      currency: "INR",
      image: null,
      url: "https://myntra.com/p1",
      hostname: "myntra.com"
    });
    currentProduct.metadata = {
      marketplace: "Myntra",
      hostname: "myntra.com",
      detectedAt: Date.now()
    };

    const nykaaProduct = processProduct({
      title: "MARS Candylicious Coloured Lip Balm 3.5g",
      brand: "MARS",
      price: 349,
      currency: "INR",
      image: null,
      url: "https://nykaa.com/p2",
      hostname: "nykaa.com"
    });
    nykaaProduct.metadata = {
      marketplace: "Nykaa",
      hostname: "nykaa.com",
      detectedAt: Date.now()
    };

    const amazonProduct = processProduct({
      title: "MARS Candylicious Coloured Lip Balm 3.5g",
      brand: "MARS",
      price: 329,
      currency: "INR",
      image: null,
      url: "https://amazon.in/p3",
      hostname: "amazon.in"
    });
    amazonProduct.metadata = {
      marketplace: "Amazon",
      hostname: "amazon.in",
      detectedAt: Date.now()
    };

    const myntraCandidate: RecommendationCandidate = {
      product: currentProduct,
      isCurrentProduct: true,
      isRefurbishedOrUsed: false,
      isUnavailable: false,
      currencyMismatch: false,
      identityConfidenceScore: 95,
      marketplaceReliabilityScore: 95,
      finalRankingScore: 95
    };

    const nykaaCandidate: RecommendationCandidate = {
      product: nykaaProduct,
      isCurrentProduct: false,
      isRefurbishedOrUsed: false,
      isUnavailable: false,
      currencyMismatch: false,
      identityConfidenceScore: 95,
      marketplaceReliabilityScore: 95,
      finalRankingScore: 95
    };

    const amazonCandidate: RecommendationCandidate = {
      product: amazonProduct,
      isCurrentProduct: false,
      isRefurbishedOrUsed: false,
      isUnavailable: false,
      currencyMismatch: false,
      identityConfidenceScore: 95,
      marketplaceReliabilityScore: 95,
      finalRankingScore: 95
    };

    const req: RecommendationRequest = {
      candidates: [myntraCandidate, nykaaCandidate, amazonCandidate],
      productContext: { currentProduct }
    };

    const productDecision = evaluateProductLevelDecisions(req);

    expect(productDecision.bestProductGroup).toBeDefined();
    expect(productDecision.bestProductGroup?.lowestPrice).toBe(329);

    const offerDecision = evaluateOfferLevelDecisions(
      req,
      productDecision.bestProductGroup!
    );

    expect(offerDecision.cheapestOffer).toBeDefined();
    expect(offerDecision.cheapestOffer?.product?.originalPrice).toBe(329);
    expect(offerDecision.cheapestOffer?.product?.metadata?.marketplace).toBe("Amazon");
  });
});
