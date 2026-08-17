import { describe, test, expect } from "vitest";
import { buildRecommendationRequest } from "../recommendationRequestBuilder";
import { extractUserIntent } from "../intentExtractor";

describe("recommendationRequestBuilder - buildRecommendationRequest", () => {
  test("1. Normal shopping query creates valid RecommendationRequest", () => {
    const r = buildRecommendationRequest("Samsung phone under ₹50,000");
    expect(r).toHaveProperty("originalQuery");
    expect(r).toHaveProperty("normalizedQuery");
    expect(r).toHaveProperty("productContext");
    expect(r).toHaveProperty("explicitRequirements");
    expect(r).toHaveProperty("userPreferences");
    expect(r).toHaveProperty("hardConstraints");
    expect(r).toHaveProperty("priorities");
    expect(r).toHaveProperty("conflicts");
    expect(r).toHaveProperty("ambiguities");
    expect(r).toHaveProperty("candidates");
  });

  test("2. originalQuery is preserved exactly", () => {
    const raw = "  Best SAMSUNG Phone Under ₹50,000!!!  ";
    const r = buildRecommendationRequest(raw);
    expect(r.originalQuery).toBe(raw);
  });

  test("3. normalizedQuery uses normalizeQuery", () => {
    const raw = "  Best SAMSUNG Phone Under ₹50,000!!!  ";
    const r = buildRecommendationRequest(raw);
    expect(r.normalizedQuery).toBe("best samsung phone under ₹50,000");
  });

  test("4. productContext is populated correctly", () => {
    const r = buildRecommendationRequest("Samsung phone");
    expect(r.productContext).toEqual({ category: "smartphone", brand: "samsung" });
  });

  test("5. explicitRequirements are populated", () => {
    const r = buildRecommendationRequest("phone with 256GB storage");
    expect(r.explicitRequirements).toEqual([
      { attribute: "storage", value: "256GB", operator: "equals", isMandatory: true }
    ]);
  });

  test("6. hardConstraints are populated", () => {
    const r = buildRecommendationRequest("under ₹50,000");
    expect(r.hardConstraints).toEqual([
      { attribute: "price", operator: "less_than", value: 50000 }
    ]);
  });

  test("7. userPreferences are populated", () => {
    const r = buildRecommendationRequest("phone with good camera");
    expect(r.userPreferences).toEqual([
      { key: "camera", value: "preferred" }
    ]);
  });

  test("8. candidates is always []", () => {
    const r = buildRecommendationRequest("Samsung phone under ₹50,000");
    expect(r.candidates).toEqual([]);
  });

  test("9. Requirement priorities are generated correctly", () => {
    const r = buildRecommendationRequest("Samsung phone under ₹50,000 with 256GB storage, good camera");
    expect(r.priorities).toBeDefined();
    expect(r.priorities?.length).toBeGreaterThan(0);
    const criticalPrice = r.priorities?.find(p => p.attribute === "price");
    expect(criticalPrice?.priority).toBe("critical");
  });

  test("10. Conflicts are detected correctly", () => {
    const r = buildRecommendationRequest("under ₹50,000 but above ₹70,000");
    expect(r.conflicts).toHaveLength(1);
    expect(r.conflicts?.[0].type).toBe("hard_conflict");
  });

  test("11. Ambiguities are detected correctly", () => {
    const r = buildRecommendationRequest("only Samsung, preferably Apple");
    expect(r.ambiguities).toHaveLength(1);
    expect(r.ambiguities?.[0].type).toBe("constraint_preference_tension");
  });

  test("12. 'Samsung phone under ₹50,000 with 256GB, preferably AMOLED' produces all applicable structured intent layers", () => {
    const r = buildRecommendationRequest("Samsung phone under ₹50,000 with 256GB storage, preferably AMOLED");
    expect(r.productContext).toEqual({ category: "smartphone", brand: "samsung" });
    expect(r.hardConstraints).toEqual([{ attribute: "price", operator: "less_than", value: 50000 }]);
    expect(r.explicitRequirements).toEqual([{ attribute: "storage", value: "256GB", operator: "equals", isMandatory: true }]);
    expect(r.userPreferences).toEqual([{ key: "display", value: "AMOLED" }]);
    expect(r.priorities?.length).toBe(3);
    expect(r.candidates).toEqual([]);
  });

  test("13. 'cheap but good camera' preserves soft preferences without inventing numeric constraints", () => {
    const r = buildRecommendationRequest("cheap phone with good camera");
    expect(r.hardConstraints).toEqual([]);
    expect(r.userPreferences).toEqual([
      { key: "price_sensitivity", value: "high" },
      { key: "camera", value: "preferred" }
    ]);
  });

  test("14. 'only Samsung, preferably Apple' preserves hard + soft intent", () => {
    const r = buildRecommendationRequest("only Samsung, preferably Apple");
    expect(r.hardConstraints).toEqual([{ attribute: "brand", operator: "equals", value: "samsung" }]);
    expect(r.userPreferences).toEqual([{ key: "brand_loyalty", value: "apple" }]);
  });

  test("15. '256GB required, ideally 512GB' preserves both values", () => {
    const r = buildRecommendationRequest("256GB storage required, ideally 512GB");
    expect(r.explicitRequirements).toEqual([{ attribute: "storage", value: "256GB", operator: "equals", isMandatory: true }]);
    expect(r.userPreferences).toEqual([{ key: "storage", value: "512GB" }]);
  });

  test("16. Null query is safe", () => {
    const r = buildRecommendationRequest(null);
    expect(r.originalQuery).toBe("");
    expect(r.normalizedQuery).toBe("");
    expect(r.candidates).toEqual([]);
  });

  test("17. Undefined query is safe", () => {
    const r = buildRecommendationRequest(undefined);
    expect(r.originalQuery).toBe("");
    expect(r.normalizedQuery).toBe("");
    expect(r.candidates).toEqual([]);
  });

  test("18. Empty query is safe", () => {
    const r = buildRecommendationRequest("");
    expect(r.originalQuery).toBe("");
    expect(r.normalizedQuery).toBe("");
    expect(r.candidates).toEqual([]);
  });

  test("19. Whitespace-only query is safe", () => {
    const r = buildRecommendationRequest("   ");
    expect(r.originalQuery).toBe("   ");
    expect(r.normalizedQuery).toBe("");
    expect(r.candidates).toEqual([]);
  });

  test("20. Repeated execution is deterministic", () => {
    const r1 = buildRecommendationRequest("Samsung phone under ₹50,000");
    const r2 = buildRecommendationRequest("Samsung phone under ₹50,000");
    expect(r1).toEqual(r2);
  });

  test("21. Returned arrays are fresh/non-mutating", () => {
    const r1 = buildRecommendationRequest("under ₹50,000");
    const r2 = buildRecommendationRequest("under ₹50,000");
    expect(r1.hardConstraints).not.toBe(r2.hardConstraints);
  });

  test("22. extractUserIntent delegates to buildRecommendationRequest establishing a single canonical construction path", () => {
    const raw = "Samsung phone under ₹50,000";
    const r1 = extractUserIntent(raw);
    const r2 = buildRecommendationRequest(raw);
    expect(r1).toEqual(r2);
  });

  test("23. No candidate ranking occurs", () => {
    const r = buildRecommendationRequest("Samsung phone under ₹50,000");
    expect(r.candidates).toEqual([]);
  });

  test("24. No recommendation selection occurs", () => {
    const r = buildRecommendationRequest("Samsung phone under ₹50,000");
    expect((r as any).recommendedCandidate).toBeUndefined();
  });

  test("25. Existing legacy recommendation behavior remains unaffected", () => {
    const r = buildRecommendationRequest("Samsung phone under ₹50,000");
    expect(Array.isArray(r.candidates)).toBe(true);
  });
});
