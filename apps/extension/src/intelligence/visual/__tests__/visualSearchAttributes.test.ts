import { describe, test, expect } from "vitest";
import type { VisualProductRecognitionResult } from "../types";
import {
  convertToSearchAttributes,
  generateSearchQuery,
  enhanceSearchQueryInput,
  normalizeVisualAttributes
} from "../searchAttributes";

describe("Phase 3.2 — Visual Search & Attribute Intelligence", () => {
  // Test 1: Visual recognition → search attributes conversion
  test("1. Converts visual recognition result to search attributes cleanly", () => {
    const visualResult: VisualProductRecognitionResult = {
      status: "recognized",
      category: "Electronics",
      brand: "Samsung",
      model: "Galaxy S24 Ultra",
      productType: "Smartphone",
      visualAttributes: {
        color: "Titanium Gray",
        formFactor: "Bar",
        material: "Titanium"
      },
      confidence: 0.95,
      evidence: []
    };

    const searchAttrs = convertToSearchAttributes(visualResult);

    expect(searchAttrs.category).toBe("Electronics");
    expect(searchAttrs.brand).toBe("Samsung");
    expect(searchAttrs.model).toBe("Galaxy S24 Ultra");
    expect(searchAttrs.productType).toBe("Smartphone");
    expect(searchAttrs.color).toBe("Titanium Gray");
    expect(searchAttrs.formFactor).toBe("Bar");
    expect(searchAttrs.material).toBe("Titanium");
    expect(searchAttrs.confidence).toBe(95);
  });

  // Test 2: Electronics visual attribute normalization
  test("2. Normalizes whitespace, casing, and preserves exact values without subjective guesses", () => {
    const rawAttrs = {
      color: "  Titanium   Gray  ",
      material: "TITANIUM",
      formFactor: "  Bar "
    };

    const normalized = normalizeVisualAttributes(rawAttrs);

    // Should collapse whitespace and trim, but preserve exact terms and casing variations (e.g. keeping Gray/TITANIUM)
    expect(normalized.color).toBe("Titanium Gray");
    expect(normalized.material).toBe("TITANIUM");
    expect(normalized.formFactor).toBe("Bar");

    // Test that we don't map color variations subjectively in our converter
    const result: VisualProductRecognitionResult = {
      status: "recognized",
      category: "Electronics",
      brand: "Samsung",
      model: "S24",
      productType: "Smartphone",
      visualAttributes: {
        color: "navy blue"
      },
      confidence: 0.9,
      evidence: []
    };

    const searchAttrs = convertToSearchAttributes(result);
    // "navy blue" must remain "navy blue" and not automatically map to "blue"
    expect(searchAttrs.color).toBe("navy blue");
  });

  // Test 3: Search query generation from supported attributes
  test("3. Generates deterministic query strings from search terms", () => {
    const searchAttrs = convertToSearchAttributes({
      status: "recognized",
      category: "Electronics",
      brand: "Samsung",
      model: "Galaxy S24 Ultra",
      productType: "Smartphone",
      visualAttributes: {
        color: "Titanium Black"
      },
      confidence: 0.9,
      evidence: []
    });

    const query = generateSearchQuery(searchAttrs);
    expect(query).toBe("Samsung Galaxy S24 Ultra Titanium Black");

    // Fallback query if brand/model are unknown
    const fallbackAttrs = convertToSearchAttributes({
      status: "recognized",
      category: "Electronics",
      brand: null,
      model: null,
      productType: "Smartphone",
      visualAttributes: {
        color: "Black"
      },
      confidence: 0.8,
      evidence: []
    });

    const fallbackQuery = generateSearchQuery(fallbackAttrs);
    expect(fallbackQuery).toBe("Black Smartphone");
  });

  // Test 4: Low-confidence evidence is preserved rather than erased
  test("4. Preserves low-confidence evidence without erasing brand/model", () => {
    const lowConfidenceResult: VisualProductRecognitionResult = {
      status: "partially_recognized",
      category: "Electronics",
      brand: "Samsung",
      model: "Galaxy S24",
      productType: "Smartphone",
      visualAttributes: {
        color: "Titanium Gray"
      },
      confidence: 0.45,
      evidence: []
    };

    const searchAttrs = convertToSearchAttributes(lowConfidenceResult);

    // Brand and model are preserved with normalized confidence 45
    expect(searchAttrs.brand).toBe("Samsung");
    expect(searchAttrs.model).toBe("Galaxy S24");
    expect(searchAttrs.confidence).toBe(45);

    const query = generateSearchQuery(searchAttrs);
    expect(query).toContain("Samsung");
    expect(query).toContain("Galaxy S24");
  });

  // Test 5: Visible specification handling
  test("5. Extracts and includes visible specifications backed by evidence", () => {
    const result: VisualProductRecognitionResult = {
      status: "recognized",
      category: "Electronics",
      brand: "LG",
      model: "Gaming Monitor",
      productType: "Monitor",
      visualAttributes: {
        visibleSpecifications: ["27 inch"]
      },
      confidence: 0.9,
      evidence: [
        { source: "ocr", description: "Found visible badge with '4K'", confidence: 0.9 },
        { source: "text", description: "Screen bezel has '144Hz' printed", confidence: 0.8 },
        { source: "other", description: "Uncertain detail '8K'", confidence: 0.3 } // low confidence evidence should be ignored
      ]
    };

    const searchAttrs = convertToSearchAttributes(result);

    expect(searchAttrs.visibleSpecifications).toContain("27 inch");
    expect(searchAttrs.visibleSpecifications).toContain("4K");
    expect(searchAttrs.visibleSpecifications).toContain("144Hz");
    expect(searchAttrs.visibleSpecifications).not.toContain("8K");

    const query = generateSearchQuery(searchAttrs);
    expect(query).toContain("27 inch");
    expect(query).toContain("4K");
    expect(query).toContain("144Hz");
  });

  // Test 6: Accessory/variant indicator handling
  test("6. Tracks accessories and variant indicators without modifying Phase 2 engines", () => {
    const result: VisualProductRecognitionResult = {
      status: "recognized",
      category: "Electronics",
      brand: "Nintendo",
      model: "Switch",
      productType: "Console",
      visualAttributes: {
        color: "Neon Blue/Red",
        accessories: ["Joy-Con Controller"],
        variantIndicators: ["OLED Model"]
      },
      confidence: 0.9,
      evidence: []
    };

    const searchAttrs = convertToSearchAttributes(result);

    expect(searchAttrs.accessories).toContain("Joy-Con Controller");
    expect(searchAttrs.variantIndicators).toContain("Neon Blue/Red");
    expect(searchAttrs.variantIndicators).toContain("OLED Model");
  });

  // Test 7: Shopping screenshot attribute filtering
  test("7. Filters out page UI clutter when handling shopping screenshots", () => {
    const result: VisualProductRecognitionResult = {
      status: "recognized",
      category: "Electronics",
      brand: "Samsung",
      model: "S24",
      productType: "Smartphone",
      visualAttributes: {
        accessories: ["Phone Charger", "Add-on Case", "Shopping Cart UI Icon"]
      },
      confidence: 0.9,
      evidence: [
        { source: "ocr", description: "Visible text 'Includes Phone Charger'", confidence: 0.9 },
        { source: "text", description: "Product comes with Add-on Case", confidence: 0.8 },
        { source: "layout", description: "Header shopping cart button", confidence: 0.9 }
      ]
    };

    // Passing type: "shopping_page_screenshot" in input metadata
    const searchAttrs = convertToSearchAttributes(result, { type: "shopping_page_screenshot" });

    // Accessories should be filtered to only include those with corresponding text/ocr evidence, removing the UI text
    expect(searchAttrs.accessories).toContain("Phone Charger");
    expect(searchAttrs.accessories).toContain("Add-on Case");
    expect(searchAttrs.accessories).not.toContain("Shopping Cart UI Icon");
  });

  // Test 8: Determinism and input immutability
  test("8. Ensures conversion is deterministic and does not mutate input parameters", () => {
    const rawAttributes = { color: "Titanium Gray", formFactor: "Bar" };
    const result: VisualProductRecognitionResult = {
      status: "recognized",
      category: "Electronics",
      brand: "Samsung",
      model: "S24",
      productType: "Smartphone",
      visualAttributes: rawAttributes,
      confidence: 0.9,
      evidence: []
    };

    const resultCopy = JSON.parse(JSON.stringify(result));

    // Convert twice and verify outputs are identical
    const output1 = convertToSearchAttributes(result);
    const output2 = convertToSearchAttributes(result);

    expect(output1).toEqual(output2);

    // Verify input result was not mutated
    expect(result).toEqual(resultCopy);
    expect(result.visualAttributes).toBe(rawAttributes); // strict reference identity preservation
  });

  // Adapter integration boundary tests
  test("9. Adapter enhances existing SearchQueryInput correctly without mutating it", () => {
    const searchAttrs = convertToSearchAttributes({
      status: "recognized",
      category: "Electronics",
      brand: "Samsung",
      model: "S24 Ultra",
      productType: "Smartphone",
      visualAttributes: {
        color: "Black",
        formFactor: "Bar"
      },
      confidence: 0.95,
      evidence: []
    });

    const existingInput = {
      title: "",
      brand: "",
      attributes: {
        storage: "256GB"
      }
    };

    const existingCopy = JSON.parse(JSON.stringify(existingInput));

    const enhanced = enhanceSearchQueryInput(searchAttrs, existingInput);

    // Verify title and brand are enhanced from visual search attributes
    expect(enhanced.title).toBe("Samsung S24 Ultra Black");
    expect(enhanced.brand).toBe("Samsung");
    expect(enhanced.model).toBe("S24 Ultra");
    expect(enhanced.category).toBe("Electronics");

    // Verify attributes are merged correctly
    expect(enhanced.attributes?.storage).toBe("256GB");
    expect(enhanced.attributes?.color).toBe("Black");
    expect(enhanced.attributes?.formFactor).toBe("Bar");

    // Verify original object was not mutated
    expect(existingInput).toEqual(existingCopy);
  });

  // Test 10: Fallback search terms generation when brand and model are unavailable
  test("10. Generates rich visual fallback search terms when brand and model are absent", () => {
    const visualResult: VisualProductRecognitionResult = {
      status: "recognized",
      category: "Beauty & Personal Care",
      brand: null,
      model: null,
      productType: "Lip Balm",
      visualAttributes: {
        color: "Pink",
        formFactor: "Stick",
        shape: "Cylindrical",
        material: "Plastic",
        design: "Tinted"
      },
      confidence: 0.85,
      evidence: []
    };

    const searchAttrs = convertToSearchAttributes(visualResult);

    expect(searchAttrs.brand).toBeNull();
    expect(searchAttrs.model).toBeNull();
    expect(searchAttrs.searchTerms).toContain("Lip Balm");
    expect(searchAttrs.searchTerms).toContain("Pink");
    expect(searchAttrs.searchTerms).toContain("Stick");
    expect(searchAttrs.searchTerms).toContain("Cylindrical");
    expect(searchAttrs.searchTerms).toContain("Plastic");
    expect(searchAttrs.searchTerms).toContain("Tinted");

    const query = generateSearchQuery(searchAttrs);
    expect(query).toContain("Lip Balm");
    expect(query).toContain("Pink");
  });
});
