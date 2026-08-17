import { describe, test, expect } from "vitest";
import { extractProductContext } from "../categoryExtractor";
import { extractUserIntent } from "../intentExtractor";

describe("categoryExtractor - extractProductContext & Intent Integration", () => {
  test("1. 'best samsung phone' → category: smartphone, brand: samsung", () => {
    const context = extractProductContext("best samsung phone");
    expect(context).toBeDefined();
    expect(context?.category).toBe("smartphone");
    expect(context?.brand).toBe("samsung");
  });

  test("2. 'Samsung smartphone' → category: smartphone, brand: samsung", () => {
    const context = extractProductContext("samsung smartphone");
    expect(context).toBeDefined();
    expect(context?.category).toBe("smartphone");
    expect(context?.brand).toBe("samsung");
  });

  test("3. 'Apple laptop' → category: laptop, brand: apple", () => {
    const context = extractProductContext("apple laptop");
    expect(context).toBeDefined();
    expect(context?.category).toBe("laptop");
    expect(context?.brand).toBe("apple");
  });

  test("4. 'Sony headphones' → category: headphones, brand: sony", () => {
    const context = extractProductContext("sony headphones");
    expect(context).toBeDefined();
    expect(context?.category).toBe("headphones");
    expect(context?.brand).toBe("sony");
  });

  test("5. 'best gaming monitor' → category: monitor", () => {
    const context = extractProductContext("best gaming monitor");
    expect(context).toBeDefined();
    expect(context?.category).toBe("monitor");
  });

  test("6. 'wireless earbuds' → category: earbuds", () => {
    const context = extractProductContext("wireless earbuds");
    expect(context).toBeDefined();
    expect(context?.category).toBe("earbuds");
  });

  test("7. '4K television' → television canonical category", () => {
    const context = extractProductContext("4k television");
    expect(context).toBeDefined();
    expect(context?.category).toBe("television");
  });

  test("8. Case-insensitive input behaves identically", () => {
    const c1 = extractProductContext("SAMSUNG PHONE");
    const c2 = extractProductContext("samsung phone");
    expect(c1).toEqual(c2);
  });

  test("9. Unknown product query does not invent a category", () => {
    const context = extractProductContext("random xyz 123 query");
    expect(context).toBeNull();
  });

  test("10. Empty query returns safe empty/null context", () => {
    expect(extractProductContext("")).toBeNull();
    expect(extractProductContext("   ")).toBeNull();
    expect(extractProductContext(null)).toBeNull();
    expect(extractProductContext(undefined)).toBeNull();
  });

  test("11. Product identifier without category does not automatically become a category unless there is authoritative existing mapping", () => {
    const context = extractProductContext("rtx 4070");
    expect(context?.category ?? null).toBeNull();
  });

  test("12. Price text does not become part of category/brand", () => {
    const context = extractProductContext("best samsung phone under ₹50,000");
    expect(context?.category).toBe("smartphone");
    expect(context?.brand).toBe("samsung");
    expect(JSON.stringify(context)).not.toContain("50000");
    expect(JSON.stringify(context)).not.toContain("50,000");
  });

  test("13. Storage text does not become part of category/brand", () => {
    const context = extractProductContext("best samsung phone with 256gb");
    expect(context?.category).toBe("smartphone");
    expect(context?.brand).toBe("samsung");
    expect(JSON.stringify(context)).not.toContain("256gb");
  });

  test("14. Extraction remains deterministic", () => {
    const query = "best samsung phone under ₹50,000 with 256gb";
    const res1 = extractProductContext(query);
    const res2 = extractProductContext(query);
    expect(res1).toEqual(res2);
  });

  test("15. extractUserIntent() correctly integrates normalizedQuery + productContext", () => {
    const request = extractUserIntent("  Best SAMSUNG phone under ₹50,000!!!  ");
    expect(request.originalQuery).toBe("  Best SAMSUNG phone under ₹50,000!!!  ");
    expect(request.normalizedQuery).toBe("best samsung phone under ₹50,000");
    expect(request.productContext).toBeDefined();
    expect(request.productContext?.category).toBe("smartphone");
    expect(request.productContext?.brand).toBe("samsung");
  });

  test("16. currentProduct remains null when extraction is based only on query text", () => {
    const request = extractUserIntent("apple laptop");
    expect(request.productContext?.currentProduct ?? null).toBeNull();
  });

  test("17. Existing RecommendationRequest remains structurally valid", () => {
    const request = extractUserIntent("sony headphones");
    expect(Array.isArray(request.explicitRequirements)).toBe(true);
    expect(Array.isArray(request.userPreferences)).toBe(true);
    expect(Array.isArray(request.hardConstraints)).toBe(true);
    expect(Array.isArray(request.candidates)).toBe(true);
  });

  test("18. Existing recommendationEngine and adapter behavior remains unaffected", () => {
    const request = extractUserIntent("best samsung phone");
    expect(request.candidates).toEqual([]);
    expect(request.explicitRequirements).toEqual([]);
  });
});
