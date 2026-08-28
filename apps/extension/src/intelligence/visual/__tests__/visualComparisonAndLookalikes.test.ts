import { describe, test, expect } from "vitest";
import { compareVisualAttributes, prepareVisualComparison } from "../visualComparison";
import { convertToSearchAttributes, generateSearchQuery } from "../searchAttributes";
import { normalizeVisualConfidence, type VisualProductRecognitionResult } from "../types";
import { compareProducts } from "../../matching";
import { processProduct } from "../../engine";
import type { ProductIntelligence } from "../../types";

describe("Phase 5.X — Visual Comparison, Lookalikes & Confidence Hardening", () => {
  // Test A: Confidence Normalization (0.85 -> 85, 0.55 -> 55, 85 -> 85, null -> null)
  test("Test A: Confidence normalization canonicalizes to 0-100 scale", () => {
    expect(normalizeVisualConfidence(0.85)).toBe(85);
    expect(normalizeVisualConfidence(0.55)).toBe(55);
    expect(normalizeVisualConfidence(0.99)).toBe(99);
    expect(normalizeVisualConfidence(85)).toBe(85);
    expect(normalizeVisualConfidence(55)).toBe(55);
    expect(normalizeVisualConfidence(100)).toBe(100);
    expect(normalizeVisualConfidence(0)).toBe(0);
    expect(normalizeVisualConfidence(null)).toBeNull();
    expect(normalizeVisualConfidence(undefined)).toBeNull();
  });

  // Test B: Low-confidence evidence preservation (0.55 / 55 preserves brand/model)
  test("Test B: Low confidence (55%) preserves extracted evidence without erasure", () => {
    const visualResult: VisualProductRecognitionResult = {
      status: "recognized",
      category: "Beauty & Personal Care",
      brand: "MARS",
      model: "Candylicious",
      productType: "Lip Balm",
      visualAttributes: {
        color: "Pink",
        formFactor: "Stick"
      },
      confidence: 0.55,
      evidence: [
        { source: "ocr", description: "Faint logo detected", confidence: 0.55 }
      ]
    };

    const searchAttrs = convertToSearchAttributes(visualResult);
    expect(searchAttrs.brand).toBe("MARS");
    expect(searchAttrs.model).toBe("Candylicious");
    expect(searchAttrs.confidence).toBe(55);
    expect(searchAttrs.evidence[0].confidence).toBe(55);
  });

  // Test D: Unknown brand/model generates valid visual search terms
  test("Test D: Unknown brand/model generates valid visual search terms from attributes", () => {
    const visualResult: VisualProductRecognitionResult = {
      status: "recognized",
      category: "Footwear",
      brand: null,
      model: null,
      productType: "Running Shoes",
      visualAttributes: {
        color: "Triple Black",
        formFactor: "Low-Top",
        material: "Mesh",
        design: "Athletic"
      },
      confidence: 0.88,
      evidence: []
    };

    const searchAttrs = convertToSearchAttributes(visualResult);
    expect(searchAttrs.brand).toBeNull();
    expect(searchAttrs.model).toBeNull();
    expect(searchAttrs.searchTerms).toContain("Running Shoes");
    expect(searchAttrs.searchTerms).toContain("Triple Black");
    expect(searchAttrs.searchTerms).toContain("Low-Top");
    expect(searchAttrs.searchTerms).toContain("Mesh");

    const query = generateSearchQuery(searchAttrs);
    expect(query).toContain("Running Shoes");
    expect(query).toContain("Triple Black");
  });

  // Test E: Visual comparison produces deterministic score (0-100)
  test("Test E: Visual comparison produces a deterministic similarity score and evidence", () => {
    const sourceAttrs = {
      color: "Black",
      productType: "Sneakers",
      formFactor: "Low-Top",
      material: "Knit",
      brand: "Puma"
    };

    const candidate: ProductIntelligence = {
      originalTitle: "Puma Electron Street Knit Shoes - Black",
      originalPrice: 2999,
      originalCurrency: "INR",
      brand: "Puma",
      model: "Electron Street",
      category: "Footwear",
      productType: "Sneakers",
      color: "Black",
      style: "Low-Top",
      material: "Knit",
      confidence: 90,
      fingerprint: "puma|electron street|black"
    };

    const comp = compareVisualAttributes(sourceAttrs, candidate);

    expect(comp.similarityScore).toBeGreaterThanOrEqual(90);
    expect(comp.matchingAttributes).toContain("productType");
    expect(comp.matchingAttributes).toContain("color");
    expect(comp.matchingAttributes).toContain("formFactor");
    expect(comp.matchingAttributes).toContain("material");
    expect(comp.conflictingAttributes.length).toBe(0);
    expect(comp.confidence).toBe(90);
    expect(comp.isLookalike).toBe(false); // Same brand, exact candidate path
  });

  // Test F: Different-brand visual similarity is classified as LOOKALIKE, not Exact Match
  test("Test F: Different-brand visual similarity is classified as LOOKALIKE, NEVER Exact Match", () => {
    const pumaSource = {
      color: "Black",
      productType: "Running Shoes",
      formFactor: "Low-Top",
      material: "Mesh",
      brand: "Puma"
    };

    const nikeLookalike: ProductIntelligence = {
      originalTitle: "Nike Revolution 6 Running Shoes - Black",
      originalPrice: 3495,
      originalCurrency: "INR",
      brand: "Nike",
      model: "Revolution 6",
      category: "Footwear",
      productType: "Running Shoes",
      color: "Black",
      style: "Low-Top",
      material: "Mesh",
      confidence: 90,
      fingerprint: "nike|revolution 6|black"
    };

    // 1. Visual Comparison identifies lookalike
    const visualComp = compareVisualAttributes(pumaSource, nikeLookalike);
    expect(visualComp.isLookalike).toBe(true);
    expect(visualComp.similarityScore).toBeGreaterThanOrEqual(70);
    expect(visualComp.lookalikeReason).toContain("Visually similar alternative from Nike");

    // 2. Exact identity matching engine strictly rejects it as Different Product
    const pumaProduct: ProductIntelligence = {
      originalTitle: "Puma Electron Street Black",
      originalPrice: 2999,
      originalCurrency: "INR",
      brand: "Puma",
      model: "Electron Street",
      category: "Footwear",
      productType: "Running Shoes",
      color: "Black",
      confidence: 90,
      fingerprint: "puma|electron street|black"
    };

    const identityMatch = compareProducts(pumaProduct, nikeLookalike);
    expect(identityMatch.isMatch).toBe(false);
    expect(identityMatch.decision).toBe("No Match");
    expect(identityMatch.similarityType).toBe("Different Product");
    expect(identityMatch.mismatchedFields).toContain("brand");
  });

  // Test G: Clearly different products remain rejected
  test("Test G: Clearly different products (conflicting category/type) receive low/negative similarity and are rejected", () => {
    const lipBalmSource = {
      color: "Pink",
      productType: "Lip Balm",
      category: "Beauty & Personal Care",
      brand: "MARS"
    };

    const laptopCandidate: ProductIntelligence = {
      originalTitle: "ASUS ROG Gaming Laptop 16GB RAM",
      originalPrice: 89990,
      originalCurrency: "INR",
      brand: "ASUS",
      model: "ROG Gaming",
      category: "Electronics",
      productType: "Laptop",
      color: "Black",
      confidence: 95,
      fingerprint: "asus|rog gaming|16gb"
    };

    const comp = compareVisualAttributes(lipBalmSource, laptopCandidate);
    expect(comp.similarityScore).toBe(0);
    expect(comp.conflictingAttributes).toContain("productType");
    expect(comp.isLookalike).toBe(false);

    const match = compareProducts(
      processProduct({
        title: "MARS Lip Balm Pink",
        brand: "MARS",
        price: 299,
        currency: "INR",
        image: null,
        url: "https://example.com/mars-lip-balm"
      }),
      laptopCandidate
    );
    expect(match.decision).toBe("No Match");
    expect(match.isMatch).toBe(false);
  });

  // Test H: Missing/invalid visual data degrades safely without exceptions
  test("Test H: Missing/invalid visual data safely degrades with null similarity score", () => {
    const emptyComp1 = compareVisualAttributes(null, null);
    expect(emptyComp1.similarityScore).toBeNull();
    expect(emptyComp1.confidence).toBeNull();
    expect(emptyComp1.evidence[0]).toContain("Visual comparison unavailable");

    const emptyComp2 = prepareVisualComparison(null, null as any);
    expect(emptyComp2.similarityScore).toBeNull();
    expect(emptyComp2.confidence).toBeNull();
  });

  // Test I: Immutability preservation during visual comparison
  test("Test I: Visual comparison is deterministic and does not mutate input objects", () => {
    const source = { color: "Red", productType: "Lipstick", brand: "Maybelline" };
    const candidate: ProductIntelligence = {
      originalTitle: "Maybelline Superstay Lipstick Red",
      originalPrice: 650,
      originalCurrency: "INR",
      brand: "Maybelline",
      model: "Superstay",
      category: "Beauty & Personal Care",
      productType: "Lipstick",
      color: "Red",
      confidence: 90,
      fingerprint: "maybelline|superstay|red"
    };

    const sourceCopy = JSON.parse(JSON.stringify(source));
    const candidateCopy = JSON.parse(JSON.stringify(candidate));

    const res1 = compareVisualAttributes(source, candidate);
    const res2 = compareVisualAttributes(source, candidate);

    expect(res1).toEqual(res2);
    expect(source).toEqual(sourceCopy);
    expect(candidate).toEqual(candidateCopy);
  });
});
