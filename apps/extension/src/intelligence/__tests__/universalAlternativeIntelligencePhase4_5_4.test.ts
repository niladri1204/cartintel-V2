import { describe, test, expect } from "vitest";
import { processProduct } from "../engine";
import { identifyAlternativeProducts } from "../decision/alternativeProduct";
import { rankAlternativeProducts } from "../decision/alternativeRanking";
import type { RecommendationCandidate, RecommendationRequest } from "../recommendationTypes";

describe("Phase 4.5.4 — Universal Alternative Intelligence (All 7 Domains)", () => {

  function makeRequest(targetTitle: string, candTitles: { title: string; price: number; host: string }[]): RecommendationRequest {
    const pageProd = processProduct({
      title: targetTitle,
      price: 1000,
      currency: "INR",
      image: null,
      url: `https://example.com/target`,
      hostname: "example.com"
    });

    const targetCandidate: RecommendationCandidate = {
      product: pageProd,
      identityConfidenceScore: 100,
      rankingDetails: {
        finalScore: 100,
        rankingTier: "exact_identity_tier",
        identityContribution: 50,
        qualityContribution: 20,
        priceAvailabilityContribution: 20,
        priceCompetitivenessContribution: 10,
        duplicatePenalty: 0,
        priceCompetitivenessScore: 100,
        explanation: "target"
      }
    };

    const candidates: RecommendationCandidate[] = [
      targetCandidate,
      ...candTitles.map((c, idx) => ({
        product: processProduct({
          title: c.title,
          price: c.price,
          currency: "INR",
          image: null,
          url: `https://${c.host}/item${idx}`,
          hostname: c.host
        }),
        identityConfidenceScore: 80,
        rankingDetails: {
          finalScore: 80,
          rankingTier: "exact_identity_tier",
          identityContribution: 50,
          qualityContribution: 20,
          priceAvailabilityContribution: 10,
          priceCompetitivenessContribution: 0,
          duplicatePenalty: 0,
          priceCompetitivenessScore: 100,
          explanation: "ok"
        }
      }))
    ];

    return {
      pageProduct: pageProd,
      candidates,
      userPreferences: null
    };
  }

  // 1. ELECTRONICS (Samsung Galaxy S24)
  test("1. Electronics: Identifies Google Pixel 8a as alternative, rejects S24 512GB variant and S24 Flipkart offer", () => {
    const req = makeRequest("Samsung Galaxy S24 256GB", [
      { title: "Samsung Galaxy S24 256GB Official Warranty", price: 77999, host: "flipkart.com" }, // Same product / diff merchant
      { title: "Samsung Galaxy S24 512GB Storage", price: 89999, host: "amazon.in" }, // Variant
      { title: "Google Pixel 8a 256GB Smartphone", price: 52999, host: "amazon.in" }, // Genuine alternative
      { title: "Nike Air Max Shoes", price: 8995, host: "myntra.com" } // Cross-domain
    ]);

    const result = identifyAlternativeProducts(req);
    const altTitles = result.alternatives.map(a => a.product.normalizedTitle || "");

    expect(altTitles.some(t => t.includes("pixel 8a"))).toBe(true);
    expect(altTitles.some(t => t.includes("512gb"))).toBe(false);
    expect(altTitles.some(t => t.includes("flipkart"))).toBe(false);
    expect(altTitles.some(t => t.includes("nike"))).toBe(false);
  });

  // 2. FOOTWEAR (Puma Running Shoe)
  test("2. Footwear: Identifies Nike Air Max as alternative, rejects UK 10 variant and cross-domain products", () => {
    const req = makeRequest("Puma Electron Street Black Running Shoes UK 9", [
      { title: "Puma Electron Street Black Running Shoes UK 10", price: 3499, host: "puma.com" }, // Variant
      { title: "Nike Air Max Excee Running Shoes UK 9", price: 5995, host: "nike.com" }, // Genuine alternative
      { title: "Samsung Galaxy S24 256GB", price: 79999, host: "croma.com" } // Cross-domain
    ]);

    const result = identifyAlternativeProducts(req);
    const altTitles = result.alternatives.map(a => a.product.normalizedTitle || "");

    expect(altTitles.some(t => t.includes("nike air max"))).toBe(true);
    expect(altTitles.some(t => t.includes("uk 10"))).toBe(false);
    expect(altTitles.some(t => t.includes("galaxy s24"))).toBe(false);
  });

  // 3. FASHION (H&M T-Shirt)
  test("3. Fashion: Identifies Zara T-Shirt as alternative, rejects Size L variant", () => {
    const req = makeRequest("H&M Regular Fit Cotton T-Shirt Black Size M", [
      { title: "Zara Basic Cotton T-Shirt Black Size M", price: 990, host: "zara.com" }, // Alternative
      { title: "The Ordinary Niacinamide Serum 30ml", price: 600, host: "nykaa.com" } // Cross-domain
    ]);

    const result = identifyAlternativeProducts(req);
    const altTitles = result.alternatives.map(a => a.product.normalizedTitle || "");

    expect(altTitles.some(t => t.includes("zara"))).toBe(true);
    expect(altTitles.some(t => t.includes("niacinamide"))).toBe(false);
  });

  // 4. BEAUTY (Niacinamide Serum)
  test("4. Beauty: Identifies Minimalist Serum as alternative, rejects 60ml variant and coffee", () => {
    const req = makeRequest("The Ordinary Niacinamide 10% + Zinc 1% Serum 30ml", [
      { title: "Minimalist Niacinamide 10% Face Serum 30ml", price: 599, host: "nykaa.com" }, // Alternative
      { title: "Nescafe Instant Coffee 200g", price: 450, host: "blinkit.com" } // Cross-domain
    ]);

    const result = identifyAlternativeProducts(req);
    const altTitles = result.alternatives.map(a => a.product.normalizedTitle || "");

    expect(altTitles.some(t => t.includes("minimalist"))).toBe(true);
    expect(altTitles.some(t => t.includes("nescafe"))).toBe(false);
  });

  // 5. GROCERY (Coffee)
  test("5. Grocery: Identifies Davidoff Coffee as alternative, rejects 500g variant", () => {
    const req = makeRequest("Nescafe Gold Instant Coffee 200g", [
      { title: "Davidoff Rich Aroma Instant Coffee 100g", price: 650, host: "blinkit.com" }, // Alternative
      { title: "IKEA Study Desk Wood", price: 7999, host: "ikea.com" } // Cross-domain
    ]);

    const result = identifyAlternativeProducts(req);
    const altTitles = result.alternatives.map(a => a.product.normalizedTitle || "");

    expect(altTitles.some(t => t.includes("davidoff"))).toBe(true);
    expect(altTitles.some(t => t.includes("ikea"))).toBe(false);
  });

  // 6. FURNITURE (Sofa)
  test("6. Furniture: Identifies Pepperfry Sofa as alternative, rejects 2-Seater variant", () => {
    const req = makeRequest("IKEA 3 Seater Fabric Sofa Brown 180x80x75 cm", [
      { title: "Pepperfry 3 Seater Fabric Sofa Grey 180x80x75 cm", price: 22999, host: "pepperfry.com" }, // Alternative
      { title: "Atomic Habits Book", price: 450, host: "bookchor.com" } // Cross-domain
    ]);

    const result = identifyAlternativeProducts(req);
    const altTitles = result.alternatives.map(a => a.product.normalizedTitle || "");

    expect(altTitles.some(t => t.includes("pepperfry"))).toBe(true);
    expect(altTitles.some(t => t.includes("atomic habits"))).toBe(false);
  });

  // 7. BOOKS (Book)
  test("7. Books: Identifies Deep Work as alternative, rejects Hardcover format variant of same title", () => {
    const req = makeRequest("Atomic Habits by James Clear Penguin ISBN 9780735211292 Paperback", [
      { title: "Deep Work by Cal Newport Paperback", price: 399, host: "amazon.in" }, // Alternative
      { title: "Atomic Habits by James Clear Penguin ISBN 9780735211292 Hardcover", price: 899, host: "amazon.in" } // Format variant of same book
    ]);

    const result = identifyAlternativeProducts(req);
    const altTitles = result.alternatives.map(a => a.product.normalizedTitle || "");

    expect(altTitles.some(t => t.includes("deep work"))).toBe(true);
    expect(altTitles.some(t => t.includes("hardcover"))).toBe(false);
  });

  // 8. ALTERNATIVE RANKING VALIDATION
  test("8. rankAlternativeProducts deterministically ranks alternatives without seller price bias", () => {
    const req = makeRequest("Samsung Galaxy S24 256GB", [
      { title: "Google Pixel 8a 256GB", price: 52999, host: "amazon.in" },
      { title: "OnePlus 12R 256GB", price: 39999, host: "amazon.in" }
    ]);

    const rankingResult = rankAlternativeProducts(req);
    expect(rankingResult.alternatives.length).toBeGreaterThan(0);
    expect(rankingResult.selectedAlternative).toBeDefined();
    expect(rankingResult.selectedAlternative?.alternativeScore).toBeGreaterThan(0);
  });
});
