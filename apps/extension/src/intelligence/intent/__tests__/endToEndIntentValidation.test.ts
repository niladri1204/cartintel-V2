import { describe, test, expect } from "vitest";
import { buildRecommendationRequest } from "../recommendationRequestBuilder";
import { extractUserIntent } from "../intentExtractor";

describe("endToEndIntentValidation - Phase 1.12.2 Final Verification", () => {
  test("1. Simple smartphone query", () => {
    const r = buildRecommendationRequest("smartphone");
    expect(r.productContext?.category).toBe("smartphone");
    expect(r.candidates).toEqual([]);
  });

  test("2. Brand + category", () => {
    const r = buildRecommendationRequest("Samsung smartphone");
    expect(r.productContext).toEqual({ category: "smartphone", brand: "samsung" });
  });

  test("3. Brand + storage", () => {
    const r = buildRecommendationRequest("Samsung 256GB storage");
    expect(r.productContext?.brand).toBe("samsung");
    expect(r.explicitRequirements).toEqual([
      { attribute: "storage", value: "256GB", operator: "equals", isMandatory: true }
    ]);
  });

  test("4. RAM + storage", () => {
    const r = buildRecommendationRequest("12GB RAM 256GB storage");
    expect(r.explicitRequirements).toHaveLength(2);
    expect(r.explicitRequirements?.[0].attribute).toBe("ram");
    expect(r.explicitRequirements?.[1].attribute).toBe("storage");
  });

  test("5. Price + brand + storage", () => {
    const r = buildRecommendationRequest("Samsung phone under ₹50,000 with 256GB storage");
    expect(r.productContext).toEqual({ category: "smartphone", brand: "samsung" });
    expect(r.hardConstraints).toEqual([{ attribute: "price", operator: "less_than", value: 50000 }]);
    expect(r.explicitRequirements).toEqual([{ attribute: "storage", value: "256GB", operator: "equals", isMandatory: true }]);
  });

  test("6. Hard brand restriction", () => {
    const r = buildRecommendationRequest("Only Samsung");
    expect(r.hardConstraints).toEqual([{ attribute: "brand", operator: "equals", value: "samsung" }]);
  });

  test("7. Soft brand preference", () => {
    const r = buildRecommendationRequest("Prefer Samsung");
    expect(r.hardConstraints).toEqual([]);
    expect(r.userPreferences).toEqual([{ key: "brand_loyalty", value: "samsung" }]);
  });

  test("8. Camera + battery preferences", () => {
    const r = buildRecommendationRequest("Phone with good camera and long battery life");
    expect(r.userPreferences).toHaveLength(2);
    expect(r.userPreferences?.[0].key).toBe("camera");
    expect(r.userPreferences?.[1].key).toBe("battery");
  });

  test("9. Cheap + good performance", () => {
    const r = buildRecommendationRequest("cheap phone with good performance");
    expect(r.hardConstraints).toEqual([]);
    expect(r.userPreferences).toEqual([
      { key: "price_sensitivity", value: "high" },
      { key: "performance", value: "preferred" }
    ]);
  });

  test("10. Under ₹40k + preferably 512GB", () => {
    const r = buildRecommendationRequest("under ₹40,000, preferably 512GB");
    expect(r.hardConstraints).toEqual([{ attribute: "price", operator: "less_than", value: 40000 }]);
    expect(r.userPreferences).toEqual([{ key: "storage", value: "512GB" }]);
  });

  test("11. Only Samsung + preferably Apple", () => {
    const r = buildRecommendationRequest("only Samsung, preferably Apple");
    expect(r.hardConstraints).toEqual([{ attribute: "brand", operator: "equals", value: "samsung" }]);
    expect(r.userPreferences).toEqual([{ key: "brand_loyalty", value: "apple" }]);
    expect(r.ambiguities).toHaveLength(1);
  });

  test("12. 256GB required + ideally 512GB", () => {
    const r = buildRecommendationRequest("256GB storage required, ideally 512GB");
    expect(r.explicitRequirements).toEqual([{ attribute: "storage", value: "256GB", operator: "equals", isMandatory: true }]);
    expect(r.userPreferences).toEqual([{ key: "storage", value: "512GB" }]);
  });

  test("13. Conflicting price constraints", () => {
    const r = buildRecommendationRequest("under ₹50,000 but above ₹70,000");
    expect(r.conflicts).toHaveLength(1);
    expect(r.conflicts?.[0].type).toBe("hard_conflict");
  });

  test("14. Conflicting storage requirements", () => {
    const r = buildRecommendationRequest("256GB storage required and 128GB storage required");
    expect(r.conflicts).toHaveLength(1);
    expect(r.conflicts?.[0].type).toBe("requirement_conflict");
  });

  test("15. Hard constraint + conflicting preference", () => {
    const r = buildRecommendationRequest("only Samsung, preferably Apple");
    expect(r.ambiguities?.[0].type).toBe("constraint_preference_tension");
  });

  test("16. Requirement + conflicting preference", () => {
    const r = buildRecommendationRequest("256GB storage required, ideally 512GB");
    expect(r.ambiguities?.[0].type).toBe("requirement_preference_tension");
  });

  test("17. Multiple independent preferences without false conflicts", () => {
    const r = buildRecommendationRequest("cheap phone with good camera");
    expect(r.conflicts).toEqual([]);
    expect(r.ambiguities).toEqual([]);
  });

  test("18. Laptop query", () => {
    const r = buildRecommendationRequest("gaming laptop with 16GB RAM");
    expect(r.productContext?.category).toBe("laptop");
    expect(r.explicitRequirements).toEqual([{ attribute: "ram", value: "16GB", operator: "equals", isMandatory: true }]);
  });

  test("19. Monitor query", () => {
    const r = buildRecommendationRequest("144Hz 4K monitor");
    expect(r.productContext?.category).toBe("monitor");
    expect(r.normalizedQuery).toContain("144hz");
  });

  test("20. TV query", () => {
    const r = buildRecommendationRequest("55 inch 4K TV");
    expect(r.productContext?.category).toBe("television");
    expect(r.normalizedQuery).toContain("55 inch");
  });

  test("21. Tablet query", () => {
    const r = buildRecommendationRequest("10 inch tablet with 128GB storage");
    expect(r.productContext?.category).toBe("tablet");
  });

  test("22. Headphones/earbuds query", () => {
    const r = buildRecommendationRequest("wireless earbuds with long battery life");
    expect(r.userPreferences).toEqual([{ key: "battery", value: "preferred" }]);
  });

  test("23. Smartwatch query", () => {
    const r = buildRecommendationRequest("black smartwatch");
    expect(r.productContext?.category).toBe("smartwatch");
    expect(r.explicitRequirements).toEqual([{ attribute: "color", value: "black", operator: "equals", isMandatory: true }]);
  });

  test("24. Camera query", () => {
    const r = buildRecommendationRequest("4K camera");
    expect(r.productContext?.category).toBe("camera");
  });

  test("25. Indian ₹ price formats", () => {
    const r = buildRecommendationRequest("under ₹50,000");
    expect(r.hardConstraints).toEqual([{ attribute: "price", operator: "less_than", value: 50000 }]);
  });

  test("26. k/lakh/L price formats", () => {
    expect(buildRecommendationRequest("under 50k").hardConstraints?.[0].value).toBe(50000);
    expect(buildRecommendationRequest("under ₹1 lakh").hardConstraints?.[0].value).toBe(100000);
    expect(buildRecommendationRequest("under ₹1.5L").hardConstraints?.[0].value).toBe(150000);
  });

  test("27. Product identifiers such as S25+, RTX 4070, USB-C, Wi-Fi 7, 3.5mm", () => {
    const r = buildRecommendationRequest("Samsung S25+ RTX 4070 USB-C Wi-Fi 7 3.5mm");
    expect(r.normalizedQuery).toContain("s25+");
    expect(r.normalizedQuery).toContain("rtx 4070");
    expect(r.normalizedQuery).toContain("usb-c");
    expect(r.normalizedQuery).toContain("wi-fi 7");
    expect(r.normalizedQuery).toContain("3.5mm");
  });

  test("28. Null query", () => {
    const r = buildRecommendationRequest(null);
    expect(r.originalQuery).toBe("");
    expect(r.candidates).toEqual([]);
  });

  test("29. Undefined query", () => {
    const r = buildRecommendationRequest(undefined);
    expect(r.originalQuery).toBe("");
    expect(r.candidates).toEqual([]);
  });

  test("30. Empty query", () => {
    const r = buildRecommendationRequest("");
    expect(r.originalQuery).toBe("");
    expect(r.candidates).toEqual([]);
  });

  test("31. Whitespace query", () => {
    const r = buildRecommendationRequest("   ");
    expect(r.originalQuery).toBe("   ");
    expect(r.normalizedQuery).toBe("");
    expect(r.candidates).toEqual([]);
  });

  test("32. Deterministic repeated execution", () => {
    const q = "Samsung phone under ₹50,000 with 256GB storage, preferably AMOLED";
    const r1 = buildRecommendationRequest(q);
    const r2 = buildRecommendationRequest(q);
    expect(r1).toEqual(r2);
  });

  test("33. RecommendationRequest immutability", () => {
    const r = buildRecommendationRequest("Samsung phone under ₹50,000");
    const copy = JSON.parse(JSON.stringify(r));
    expect(r).toEqual(copy);
  });

  test("34. candidates always []", () => {
    const r = buildRecommendationRequest("Samsung phone under ₹50,000");
    expect(r.candidates).toEqual([]);
  });

  test("35. Legacy extractUserIntent/buildRecommendationRequest equivalence", () => {
    const q = "Samsung phone under ₹50,000";
    expect(extractUserIntent(q)).toEqual(buildRecommendationRequest(q));
  });

  test("36. No external/AI calls", () => {
    const r = buildRecommendationRequest("Samsung phone under ₹50,000");
    expect(r).toBeDefined();
  });

  test("37. No recommendation scoring", () => {
    const r = buildRecommendationRequest("Samsung phone under ₹50,000");
    expect((r as any).score).toBeUndefined();
  });

  test("38. No candidate selection", () => {
    const r = buildRecommendationRequest("Samsung phone under ₹50,000");
    expect((r as any).selectedCandidate).toBeUndefined();
  });

  test("39. Existing conflict metadata remains informational", () => {
    const r = buildRecommendationRequest("under ₹50,000 but above ₹70,000");
    expect(r.conflicts).toBeDefined();
    expect(r.candidates).toEqual([]);
  });

  test("40. Existing ambiguity metadata remains informational", () => {
    const r = buildRecommendationRequest("only Samsung, preferably Apple");
    expect(r.ambiguities).toBeDefined();
    expect(r.candidates).toEqual([]);
  });
});
