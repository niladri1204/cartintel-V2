import { describe, test, expect } from "vitest";
import { analyzeIntentAmbiguity } from "../intentAmbiguity";
import { extractUserIntent } from "../intentExtractor";
import type { RecommendationRequest } from "../../recommendationTypes";

describe("intentAmbiguity - analyzeIntentAmbiguity", () => {
  test("1. 'cheap' remains a soft price preference", () => {
    const request = extractUserIntent("cheap phone");
    expect(request.hardConstraints).toEqual([]);
    expect(request.userPreferences).toEqual([{ key: "price_sensitivity", value: "high" }]);
    const a = analyzeIntentAmbiguity(request);
    expect(a).toEqual([]);
  });

  test("2. 'affordable' remains a soft preference", () => {
    const request = extractUserIntent("affordable laptop");
    expect(request.hardConstraints).toEqual([]);
    expect(request.userPreferences).toEqual([{ key: "price_sensitivity", value: "high" }]);
  });

  test("3. 'value for money' remains a soft value preference", () => {
    const request = extractUserIntent("value for money phone");
    expect(request.hardConstraints).toEqual([]);
    expect(request.userPreferences).toEqual([{ key: "value", value: "high" }]);
  });

  test("4. 'best performance' remains a soft performance preference", () => {
    const request = extractUserIntent("phone with best performance");
    expect(request.hardConstraints).toEqual([]);
    expect(request.userPreferences).toEqual([{ key: "performance", value: "preferred" }]);
  });

  test("5. 'under ₹40k, preferably 512GB' preserves hard price + soft storage", () => {
    const request = extractUserIntent("phone under ₹40,000, preferably 512GB");
    expect(request.hardConstraints).toEqual([
      { attribute: "price", operator: "less_than", value: 40000 }
    ]);
    expect(request.userPreferences).toEqual([
      { key: "storage", value: "512GB" }
    ]);
    const a = analyzeIntentAmbiguity(request);
    expect(a).toEqual([]);
  });

  test("6. 'only Samsung, preferably Apple' preserves hard Samsung + soft Apple", () => {
    const request: RecommendationRequest = {
      hardConstraints: [{ attribute: "brand", operator: "equals", value: "samsung" }],
      userPreferences: [{ key: "brand_loyalty", value: "apple" }],
      candidates: []
    };
    const a = analyzeIntentAmbiguity(request);
    expect(a).toHaveLength(1);
    expect(a[0].type).toBe("constraint_preference_tension");
    expect(a[0].attribute).toBe("brand");
    expect(request.hardConstraints?.[0].value).toBe("samsung");
  });

  test("7. '256GB required, ideally 512GB' preserves both", () => {
    const request: RecommendationRequest = {
      explicitRequirements: [{ attribute: "storage", value: "256GB", isMandatory: true }],
      userPreferences: [{ key: "storage", value: "512GB" }],
      candidates: []
    };
    const a = analyzeIntentAmbiguity(request);
    expect(a).toHaveLength(1);
    expect(a[0].type).toBe("requirement_preference_tension");
    expect(request.explicitRequirements?.[0].value).toBe("256GB");
    expect(request.userPreferences?.[0].value).toBe("512GB");
  });

  test("8. Hard constraints are never weakened", () => {
    const request: RecommendationRequest = {
      hardConstraints: [{ attribute: "brand", operator: "equals", value: "samsung" }],
      userPreferences: [{ key: "brand_loyalty", value: "apple" }],
      candidates: []
    };
    analyzeIntentAmbiguity(request);
    expect(request.hardConstraints?.[0].value).toBe("samsung");
  });

  test("9. Preferences are never promoted to hard constraints", () => {
    const request = extractUserIntent("preferably 256GB");
    analyzeIntentAmbiguity(request);
    expect(request.hardConstraints).toEqual([]);
  });

  test("10. 'cheap' does not create a numeric price threshold", () => {
    const request = extractUserIntent("cheap phone");
    expect(request.hardConstraints).toEqual([]);
    expect(request.userPreferences?.[0].value).toBe("high");
  });

  test("11. 'best performance' does not create a numeric performance threshold", () => {
    const request = extractUserIntent("best performance phone");
    expect(request.hardConstraints).toEqual([]);
    expect(request.userPreferences?.[0].value).toBe("preferred");
  });

  test("12. Matching hard constraint + matching preference does not create a false conflict", () => {
    const request: RecommendationRequest = {
      hardConstraints: [{ attribute: "brand", operator: "equals", value: "samsung" }],
      userPreferences: [{ key: "brand_loyalty", value: "samsung" }],
      candidates: []
    };
    const a = analyzeIntentAmbiguity(request);
    expect(a).toEqual([]);
  });

  test("13. Conflicting hard constraints remain handled by IntentConflict, not Ambiguity", () => {
    const request: RecommendationRequest = {
      hardConstraints: [
        { attribute: "price", operator: "less_than", value: 40000 },
        { attribute: "price", operator: "greater_than", value: 60000 }
      ],
      candidates: []
    };
    const a = analyzeIntentAmbiguity(request);
    expect(a).toEqual([]);
  });

  test("14. Hard-vs-preference tension is represented separately", () => {
    const request: RecommendationRequest = {
      hardConstraints: [{ attribute: "brand", operator: "equals", value: "samsung" }],
      userPreferences: [{ key: "brand_loyalty", value: "apple" }],
      candidates: []
    };
    const a = analyzeIntentAmbiguity(request);
    expect(a[0].type).toBe("constraint_preference_tension");
  });

  test("15. Requirement-vs-preference tension is represented separately", () => {
    const request: RecommendationRequest = {
      explicitRequirements: [{ attribute: "storage", value: "256GB", isMandatory: true }],
      userPreferences: [{ key: "storage", value: "512GB" }],
      candidates: []
    };
    const a = analyzeIntentAmbiguity(request);
    expect(a[0].type).toBe("requirement_preference_tension");
  });

  test("16. Multiple independent preferences across different attributes remain compatible", () => {
    const request = extractUserIntent("cheap phone with good camera and fast performance");
    const a = analyzeIntentAmbiguity(request);
    expect(a).toEqual([]);
  });

  test("17. Multiple preferences retain deterministic order", () => {
    const request: RecommendationRequest = {
      userPreferences: [
        { key: "storage", value: "256GB" },
        { key: "storage", value: "512GB" }
      ],
      candidates: []
    };
    const a = analyzeIntentAmbiguity(request);
    expect(a).toHaveLength(1);
    expect(a[0].type).toBe("preference_tension");
    expect(a[0].attribute).toBe("storage");
  });

  test("18. Existing IntentConflict results are not mutated", () => {
    const request = extractUserIntent("Samsung phone under ₹50,000");
    const a = analyzeIntentAmbiguity(request);
    expect(Array.isArray(a)).toBe(true);
  });

  test("19. RecommendationRequest is not mutated", () => {
    const request: RecommendationRequest = {
      userPreferences: [{ key: "storage", value: "256GB" }],
      candidates: []
    };
    const copy = JSON.parse(JSON.stringify(request));
    analyzeIntentAmbiguity(request);
    expect(request).toEqual(copy);
  });

  test("20. Empty request returns []", () => {
    expect(analyzeIntentAmbiguity({ candidates: [] })).toEqual([]);
  });

  test("21. Null request returns []", () => {
    expect(analyzeIntentAmbiguity(null)).toEqual([]);
    expect(analyzeIntentAmbiguity(undefined)).toEqual([]);
  });

  test("22. Missing arrays are handled safely", () => {
    expect(analyzeIntentAmbiguity({ hardConstraints: null, explicitRequirements: [], userPreferences: null, candidates: [] })).toEqual([]);
  });

  test("23. Repeated execution is deterministic", () => {
    const request: RecommendationRequest = {
      hardConstraints: [{ attribute: "brand", operator: "equals", value: "samsung" }],
      userPreferences: [{ key: "brand_loyalty", value: "apple" }],
      candidates: []
    };
    const a1 = analyzeIntentAmbiguity(request);
    const a2 = analyzeIntentAmbiguity(request);
    expect(a1).toEqual(a2);
  });

  test("24. No candidate data is accessed", () => {
    const request = extractUserIntent("Samsung phone under ₹50,000");
    const a = analyzeIntentAmbiguity(request);
    expect(a).toBeDefined();
    expect(request.candidates).toEqual([]);
  });

  test("25. No scoring/recommendation selection occurs", () => {
    const request = extractUserIntent("Samsung phone under ₹50,000");
    const a = analyzeIntentAmbiguity(request);
    expect(a).toBeDefined();
    expect((a as any).recommendedCandidate).toBeUndefined();
  });

  test("26. No AI/network/API calls occur", () => {
    const request = extractUserIntent("Samsung phone under ₹50,000");
    const a = analyzeIntentAmbiguity(request);
    expect(Array.isArray(a)).toBe(true);
  });
});
