import { describe, test, expect } from "vitest";
import { inferCategoryAndType, determineCategory } from "../category";
import { inferDomain, ProductDomain } from "../domain";
import { processProduct } from "../engine";
import { compareProducts } from "../matching";
import { generateFingerprint } from "../fingerprint";
import { identifyAlternativeProducts } from "../decision/alternativeProduct";
import { evaluateProductLevelDecisions } from "../decision/productDecision";
import { evaluateOfferLevelDecisions } from "../decision/offerDecision";
import { sanitizePurchaseUrl, validatePurchaseUrlSafety } from "../purchaseSafety";

describe("Phase 4.5.6 — Missing-Data & Ambiguity Hardening", () => {

  // =========================================================================
  // 1. EMPTY / NULL TITLE HANDLING
  // =========================================================================
  test("1. Empty or null title degrades safely to Uncategorized without throwing", () => {
    const emptyInputs = [null, undefined, "", "   ", "\t\n"];

    for (const input of emptyInputs) {
      const catRes = inferCategoryAndType(input as any);
      expect(catRes.category).toBe("Uncategorized");
      expect(catRes.productType).toBeNull();

      const dom = inferDomain(catRes.category, input as any);
      expect(dom).toBe(ProductDomain.General);

      const prod = processProduct({
        title: input as any,
        price: null,
        currency: null,
        image: null,
        url: null,
        hostname: ""
      });

      expect(prod.normalizedTitle == null || prod.normalizedTitle === "").toBe(true);
      expect(prod.brand).toBeNull();
      expect(prod.model).toBeNull();
      expect(prod.productType).toBeNull();
      expect(prod.confidence).toBe(0);
    }
  });

  // =========================================================================
  // 2. UNKNOWN BRAND & MISSING MODEL
  // =========================================================================
  test("2. Unknown brand and missing model produce zero fake brand/model and low confidence score", () => {
    const prod = processProduct({
      title: "Random Unspecified Device XYZ-9988",
      price: 1500,
      currency: "INR",
      image: null,
      url: "https://example.com/p",
      hostname: "example.com"
    });

    expect(prod.brand).toBeNull(); // No invented brand
    expect(prod.confidence).toBeLessThan(70); // Low confidence score

    const fp = generateFingerprint(prod.brand || null, prod.model || null, null, null, null, null);
    expect(fp).not.toContain("fake");
    expect(fp).not.toContain("undefined");
  });

  // =========================================================================
  // 3. MISSING PRICE, MERCHANT, & URL
  // =========================================================================
  test("3. Missing price, merchant metadata, or URL does not crash decision or matching engines", () => {
    const sparse1 = processProduct({
      title: "Generic Item",
      price: null,
      currency: null,
      image: null,
      url: null,
      hostname: ""
    });

    const sparse2 = processProduct({
      title: "Another Item",
      price: 0,
      currency: "INR",
      image: null,
      url: "",
      hostname: "unknown"
    });

    expect(sparse1.originalPrice).toBeNull();
    expect(sparse2.originalPrice).toBe(0);

    const match = compareProducts(sparse1, sparse2);
    expect(match.decision).toBeDefined();
    expect(match.confidence).toBeLessThanOrEqual(50);

    const urlCheck = validatePurchaseUrlSafety(sparse1.originalUrl || null, "example.com");
    expect(urlCheck.isValid).toBe(false);
  });

  // =========================================================================
  // 4. GENERIC PRODUCT TITLES
  // =========================================================================
  test("4. Extremely generic titles ('Item', 'Stuff', 'Object') degrade to General domain with zero invented certainty", () => {
    const genericTitles = ["Item", "Stuff", "Product XYZ", "Thing", "Object 123"];

    for (const title of genericTitles) {
      const catRes = inferCategoryAndType(title);
      expect(catRes.category).toBe("Uncategorized");
      expect(catRes.productType).toBeNull();

      const dom = inferDomain(catRes.category, title);
      expect(dom).toBe(ProductDomain.General);

      const prod = processProduct({
        title,
        price: 100,
        currency: "INR",
        image: null,
        url: `https://example.com/${title}`,
        hostname: "example.com"
      });

      expect(prod.brand).toBeNull();
      expect(prod.category).toBe("Uncategorized");
      expect(prod.productType).toBeNull();
      expect(prod.confidence).toBeLessThan(70);
    }
  });

  // =========================================================================
  // 5. CONFLICTING CATEGORY VS TITLE
  // =========================================================================
  test("5. Conflicting explicit category vs title is handled safely without corruption", () => {
    // Title clearly says Smartphone, but input passes category "Fashion"
    const dom = inferDomain("Fashion");
    expect(dom).toBe(ProductDomain.Fashion);

    const prod = processProduct({
      title: "Samsung Galaxy S24 256GB Smartphone",
      price: 79999,
      currency: "INR",
      image: null,
      url: "https://amazon.in/p",
      hostname: "amazon.in"
    });

    expect(prod.domain).toBe(ProductDomain.Electronics);
    expect(prod.category).toBe("Electronics");
    expect(prod.productType).toBe("Smartphone");
  });

  // =========================================================================
  // 6. PIPELINE SAFE DEGRADATION ON SPARSE CANDIDATES
  // =========================================================================
  test("6. Full decision and alternative pipeline degrades safely on sparse or empty candidate arrays", () => {
    const reqEmpty = { pageProduct: null, candidates: [], userPreferences: null };

    const prodDec = evaluateProductLevelDecisions(reqEmpty as any);
    expect(prodDec.bestProductGroup).toBeNull();
    expect(prodDec.productGroups).toHaveLength(0);

    const offerDec = evaluateOfferLevelDecisions(reqEmpty as any, null);
    expect(offerDec.bestOffer).toBeNull();
    expect(offerDec.cheapestOffer).toBeNull();

    const altResult = identifyAlternativeProducts(reqEmpty as any);
    expect(altResult.recommendedProduct).toBeNull();
    expect(altResult.alternatives).toHaveLength(0);
  });
});
