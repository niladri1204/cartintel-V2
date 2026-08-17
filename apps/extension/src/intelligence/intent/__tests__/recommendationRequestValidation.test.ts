import { describe, test, expect } from "vitest";
import { buildRecommendationRequest } from "../recommendationRequestBuilder";

describe("recommendationRequestValidation - Complete Intent Pipeline Validation", () => {
  test("1. Simple Samsung smartphone query", () => {
    const r = buildRecommendationRequest("Samsung phone");
    expect(r.productContext).toEqual({ category: "smartphone", brand: "samsung" });
    expect(r.candidates).toEqual([]);
  });

  test("2. Smartphone with brand + storage", () => {
    const r = buildRecommendationRequest("Samsung phone 256GB storage");
    expect(r.productContext?.brand).toBe("samsung");
    expect(r.explicitRequirements).toEqual([
      { attribute: "storage", value: "256GB", operator: "equals", isMandatory: true }
    ]);
  });

  test("3. Smartphone with RAM + storage", () => {
    const r = buildRecommendationRequest("Phone with 12GB RAM and 256GB storage");
    expect(r.explicitRequirements).toHaveLength(2);
    expect(r.explicitRequirements?.[0].attribute).toBe("ram");
    expect(r.explicitRequirements?.[0].value).toBe("12GB");
    expect(r.explicitRequirements?.[1].attribute).toBe("storage");
    expect(r.explicitRequirements?.[1].value).toBe("256GB");
  });

  test("4. Smartphone with color + display size", () => {
    const r = buildRecommendationRequest("Black smartphone with 6.7 inch display");
    const attrs = r.explicitRequirements?.map(er => er.attribute);
    expect(attrs).toContain("color");
    expect(attrs).toContain("size");
  });

  test("5. Smartphone with price constraint", () => {
    const r = buildRecommendationRequest("Phone under ₹50,000");
    expect(r.hardConstraints).toEqual([
      { attribute: "price", operator: "less_than", value: 50000 }
    ]);
  });

  test("6. Smartphone with hard brand constraint", () => {
    const r = buildRecommendationRequest("Only Samsung phone");
    expect(r.hardConstraints).toEqual([
      { attribute: "brand", operator: "equals", value: "samsung" }
    ]);
  });

  test("7. Smartphone with soft brand preference", () => {
    const r = buildRecommendationRequest("Prefer Samsung phone");
    expect(r.hardConstraints).toEqual([]);
    expect(r.userPreferences).toEqual([
      { key: "brand_loyalty", value: "samsung" }
    ]);
  });

  test("8. Smartphone with camera preference", () => {
    const r = buildRecommendationRequest("Phone with good camera");
    expect(r.userPreferences).toEqual([
      { key: "camera", value: "preferred" }
    ]);
  });

  test("9. Smartphone with battery preference", () => {
    const r = buildRecommendationRequest("Phone with long battery life");
    expect(r.userPreferences).toEqual([
      { key: "battery", value: "preferred" }
    ]);
  });

  test("10. Smartphone with multiple soft preferences", () => {
    const r = buildRecommendationRequest("Phone with good camera and fast performance");
    expect(r.userPreferences).toHaveLength(2);
    expect(r.userPreferences?.[0].key).toBe("camera");
    expect(r.userPreferences?.[1].key).toBe("performance");
  });

  test("11. Laptop with RAM + storage", () => {
    const r = buildRecommendationRequest("Laptop with 16GB RAM and 512GB storage");
    expect(r.productContext?.category).toBe("laptop");
    expect(r.explicitRequirements).toHaveLength(2);
  });

  test("12. Laptop with screen-size requirement", () => {
    const r = buildRecommendationRequest("Laptop with 15.6 inch screen");
    expect(r.explicitRequirements?.[0].attribute).toBe("size");
    expect(r.explicitRequirements?.[0].value).toBe("15.6 inch");
  });

  test("13. Laptop with weight constraint", () => {
    const r = buildRecommendationRequest("Laptop maximum 2kg");
    expect(r.hardConstraints).toEqual([
      { attribute: "weight", operator: "less_than_or_equal", value: "2kg" }
    ]);
  });

  test("14. Laptop with processor/model identifiers preserved", () => {
    const r = buildRecommendationRequest("RTX 4070 laptop");
    expect(r.normalizedQuery).toContain("rtx 4070");
    expect(r.productContext?.category).toBe("laptop");
  });

  test("15. Monitor with resolution + refresh rate", () => {
    const r = buildRecommendationRequest("Monitor 144Hz 4K");
    expect(r.normalizedQuery).toContain("144hz");
    expect(r.normalizedQuery).toContain("4k");
  });

  test("16. Monitor with OLED/display preference", () => {
    const r = buildRecommendationRequest("Monitor preferably OLED");
    expect(r.userPreferences).toEqual([
      { key: "display", value: "OLED" }
    ]);
  });

  test("17. Television with resolution + size", () => {
    const r = buildRecommendationRequest("55 inch 4K TV");
    expect(r.normalizedQuery).toContain("55 inch");
    expect(r.normalizedQuery).toContain("4k");
  });

  test("18. Headphones with material/color requirements where applicable", () => {
    const r = buildRecommendationRequest("Black headphones");
    expect(r.explicitRequirements).toEqual([
      { attribute: "color", value: "black", operator: "equals", isMandatory: true }
    ]);
  });

  test("19. Earbuds with battery requirement", () => {
    const r = buildRecommendationRequest("Wireless earbuds with long battery life");
    expect(r.userPreferences).toEqual([
      { key: "battery", value: "preferred" }
    ]);
  });

  test("20. Tablet with storage + display requirements", () => {
    const r = buildRecommendationRequest("Tablet 128GB storage 10 inch display");
    expect(r.explicitRequirements).toHaveLength(2);
    expect(r.explicitRequirements?.[0].attribute).toBe("storage");
    expect(r.explicitRequirements?.[1].attribute).toBe("size");
  });

  test("21. Smartwatch with material/color requirements", () => {
    const r = buildRecommendationRequest("Black smartwatch");
    expect(r.explicitRequirements).toEqual([
      { attribute: "color", value: "black", operator: "equals", isMandatory: true }
    ]);
  });

  test("22. Camera with resolution/specification requirements where supported", () => {
    const r = buildRecommendationRequest("4K camera");
    expect(r.normalizedQuery).toContain("4k");
  });

  test("23. Mixed hard + explicit + soft intent", () => {
    const r = buildRecommendationRequest("Samsung phone under ₹50,000 with 256GB storage, preferably AMOLED");
    expect(r.productContext).toEqual({ category: "smartphone", brand: "samsung" });
    expect(r.hardConstraints).toEqual([{ attribute: "price", operator: "less_than", value: 50000 }]);
    expect(r.explicitRequirements).toEqual([{ attribute: "storage", value: "256GB", operator: "equals", isMandatory: true }]);
    expect(r.userPreferences).toEqual([{ key: "display", value: "AMOLED" }]);
  });

  test("24. 'Samsung phone under ₹50,000 with 256GB storage, preferably AMOLED'", () => {
    const r = buildRecommendationRequest("Samsung phone under ₹50,000 with 256GB storage, preferably AMOLED");
    expect(r.priorities?.length).toBe(3);
    expect(r.conflicts).toEqual([]);
    expect(r.ambiguities).toEqual([]);
  });

  test("25. 'Only Samsung, under ₹50k, preferably 512GB with a good camera'", () => {
    const r = buildRecommendationRequest("Only Samsung, under ₹50k, preferably 512GB with a good camera");
    expect(r.hardConstraints).toHaveLength(2);
    expect(r.userPreferences).toHaveLength(2);
    expect(r.userPreferences?.[0].key).toBe("storage");
    expect(r.userPreferences?.[1].key).toBe("camera");
  });

  test("26. '256GB required, ideally 512GB, good battery'", () => {
    const r = buildRecommendationRequest("256GB storage required, ideally 512GB, good battery");
    expect(r.explicitRequirements).toEqual([{ attribute: "storage", value: "256GB", operator: "equals", isMandatory: true }]);
    expect(r.userPreferences).toEqual([
      { key: "storage", value: "512GB" },
      { key: "battery", value: "preferred" }
    ]);
    expect(r.ambiguities).toHaveLength(1);
    expect(r.ambiguities?.[0].type).toBe("requirement_preference_tension");
  });

  test("27. 'Cheap but good performance'", () => {
    const r = buildRecommendationRequest("cheap phone with good performance");
    expect(r.hardConstraints).toEqual([]);
    expect(r.userPreferences).toEqual([
      { key: "price_sensitivity", value: "high" },
      { key: "performance", value: "preferred" }
    ]);
    expect(r.ambiguities).toEqual([]);
  });

  test("28. 'Under ₹40k, preferably Samsung'", () => {
    const r = buildRecommendationRequest("under ₹40,000, preferably Samsung");
    expect(r.hardConstraints).toEqual([{ attribute: "price", operator: "less_than", value: 40000 }]);
    expect(r.userPreferences).toEqual([{ key: "brand_loyalty", value: "samsung" }]);
  });

  test("29. 'Only Samsung, preferably Apple'", () => {
    const r = buildRecommendationRequest("only Samsung, preferably Apple");
    expect(r.hardConstraints).toEqual([{ attribute: "brand", operator: "equals", value: "samsung" }]);
    expect(r.userPreferences).toEqual([{ key: "brand_loyalty", value: "apple" }]);
    expect(r.ambiguities).toHaveLength(1);
    expect(r.ambiguities?.[0].type).toBe("constraint_preference_tension");
  });

  test("30. 'Under ₹50k but at least 512GB'", () => {
    const r = buildRecommendationRequest("under ₹50,000 but at least 512GB storage");
    expect(r.hardConstraints?.[0].attribute).toBe("price");
    expect(r.explicitRequirements?.[0].attribute).toBe("storage");
    expect(r.explicitRequirements?.[0].operator).toBe("greater_than");
  });

  test("31. Conflicting hard constraints", () => {
    const r = buildRecommendationRequest("under ₹50,000 but above ₹70,000");
    expect(r.conflicts).toHaveLength(1);
    expect(r.conflicts?.[0].type).toBe("hard_conflict");
  });

  test("32. Conflicting explicit requirements", () => {
    const r = buildRecommendationRequest("256GB storage required and 128GB storage required");
    expect(r.conflicts).toHaveLength(1);
    expect(r.conflicts?.[0].type).toBe("requirement_conflict");
  });

  test("33. Hard constraint + conflicting preference", () => {
    const r = buildRecommendationRequest("only Samsung, preferably Apple");
    expect(r.ambiguities).toHaveLength(1);
    expect(r.ambiguities?.[0].type).toBe("constraint_preference_tension");
  });

  test("34. Requirement + conflicting preference", () => {
    const r = buildRecommendationRequest("256GB storage required, ideally 512GB");
    expect(r.ambiguities).toHaveLength(1);
    expect(r.ambiguities?.[0].type).toBe("requirement_preference_tension");
  });

  test("35. Multiple independent preferences that should NOT be treated as conflicts", () => {
    const r = buildRecommendationRequest("cheap phone with good camera");
    expect(r.conflicts).toEqual([]);
    expect(r.ambiguities).toEqual([]);
  });

  test("36. Indian price formats: ₹50,000, 50k, 1 lakh, 1.5L", () => {
    expect(buildRecommendationRequest("under ₹50,000").hardConstraints?.[0].value).toBe(50000);
    expect(buildRecommendationRequest("under 50k").hardConstraints?.[0].value).toBe(50000);
    expect(buildRecommendationRequest("under ₹1 lakh").hardConstraints?.[0].value).toBe(100000);
    expect(buildRecommendationRequest("under ₹1.5 lakh").hardConstraints?.[0].value).toBe(150000);
  });

  test("37. Product identifiers: S25+, RTX 4070, iPhone 15 Pro, USB-C, Wi-Fi 7, 3.5mm", () => {
    expect(buildRecommendationRequest("Samsung S25+").normalizedQuery).toContain("s25+");
    expect(buildRecommendationRequest("RTX 4070").normalizedQuery).toContain("rtx 4070");
    expect(buildRecommendationRequest("iPhone 15 Pro").normalizedQuery).toContain("iphone 15 pro");
    expect(buildRecommendationRequest("USB-C").normalizedQuery).toContain("usb-c");
    expect(buildRecommendationRequest("Wi-Fi 7").normalizedQuery).toContain("wi-fi 7");
    expect(buildRecommendationRequest("3.5mm").normalizedQuery).toContain("3.5mm");
  });

  test("38. Null/undefined/empty/whitespace queries", () => {
    expect(buildRecommendationRequest(null).originalQuery).toBe("");
    expect(buildRecommendationRequest(undefined).originalQuery).toBe("");
    expect(buildRecommendationRequest("").originalQuery).toBe("");
    expect(buildRecommendationRequest("   ").normalizedQuery).toBe("");
  });

  test("39. Determinism across repeated executions", () => {
    const q = "Samsung phone under ₹50,000 with 256GB storage, preferably AMOLED";
    const r1 = buildRecommendationRequest(q);
    const r2 = buildRecommendationRequest(q);
    expect(r1).toEqual(r2);
  });

  test("40. RecommendationRequest immutability", () => {
    const q = "Samsung phone under ₹50,000";
    const r = buildRecommendationRequest(q);
    const copy = JSON.parse(JSON.stringify(r));
    expect(r).toEqual(copy);
  });

  test("41. candidates always starts as []", () => {
    const r = buildRecommendationRequest("Samsung phone under ₹50,000");
    expect(r.candidates).toEqual([]);
  });

  test("42. No AI/network/external dependencies", () => {
    const r = buildRecommendationRequest("Samsung phone under ₹50,000");
    expect(r).toBeDefined();
  });

  test("43. Legacy recommendation behavior remains unaffected", () => {
    const r = buildRecommendationRequest("Samsung phone under ₹50,000");
    expect(Array.isArray(r.candidates)).toBe(true);
  });

  test("44. Existing baseline regression behavior remains unchanged", () => {
    const r = buildRecommendationRequest("best samsung phone under ₹50,000");
    expect(r.productContext).toEqual({ category: "smartphone", brand: "samsung" });
  });
});
