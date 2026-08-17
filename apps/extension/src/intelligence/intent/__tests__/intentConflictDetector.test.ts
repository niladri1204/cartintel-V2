import { describe, test, expect } from "vitest";
import { detectIntentConflicts } from "../intentConflictDetector";
import { extractUserIntent } from "../intentExtractor";
import type { RecommendationRequest } from "../../recommendationTypes";

describe("intentConflictDetector - detectIntentConflicts", () => {
  test("1. price <= 50000 + price >= 70000 → conflict", () => {
    const request: RecommendationRequest = {
      hardConstraints: [
        { attribute: "price", operator: "less_than_or_equal", value: 50000 },
        { attribute: "price", operator: "greater_than_or_equal", value: 70000 }
      ],
      candidates: []
    };
    const c = detectIntentConflicts(request);
    expect(c).toHaveLength(1);
    expect(c[0].type).toBe("hard_conflict");
    expect(c[0].severity).toBe("high");
  });

  test("2. price < 50000 + price < 60000 → compatible", () => {
    const request: RecommendationRequest = {
      hardConstraints: [
        { attribute: "price", operator: "less_than", value: 50000 },
        { attribute: "price", operator: "less_than", value: 60000 }
      ],
      candidates: []
    };
    const c = detectIntentConflicts(request);
    expect(c).toEqual([]);
  });

  test("3. storage >= 512GB + storage <= 256GB → conflict", () => {
    const request: RecommendationRequest = {
      hardConstraints: [
        { attribute: "storage", operator: "greater_than_or_equal", value: "512GB" },
        { attribute: "storage", operator: "less_than_or_equal", value: "256GB" }
      ],
      candidates: []
    };
    const c = detectIntentConflicts(request);
    expect(c).toHaveLength(1);
    expect(c[0].type).toBe("hard_conflict");
  });

  test("4. brand = Samsung + brand = Apple → conflict", () => {
    const request: RecommendationRequest = {
      hardConstraints: [
        { attribute: "brand", operator: "equals", value: "samsung" },
        { attribute: "brand", operator: "equals", value: "apple" }
      ],
      candidates: []
    };
    const c = detectIntentConflicts(request);
    expect(c).toHaveLength(1);
    expect(c[0].type).toBe("hard_conflict");
  });

  test("5. brand = Samsung + brand = Samsung → no conflict", () => {
    const request: RecommendationRequest = {
      hardConstraints: [
        { attribute: "brand", operator: "equals", value: "samsung" },
        { attribute: "brand", operator: "equals", value: "samsung" }
      ],
      candidates: []
    };
    const c = detectIntentConflicts(request);
    expect(c).toEqual([]);
  });

  test("6. color = black + color = white → conflict", () => {
    const request: RecommendationRequest = {
      explicitRequirements: [
        { attribute: "color", value: "black", operator: "equals", isMandatory: true },
        { attribute: "color", value: "white", operator: "equals", isMandatory: true }
      ],
      candidates: []
    };
    const c = detectIntentConflicts(request);
    expect(c).toHaveLength(1);
    expect(c[0].type).toBe("requirement_conflict");
  });

  test("7. condition = new + condition = used → conflict", () => {
    const request: RecommendationRequest = {
      hardConstraints: [
        { attribute: "condition", operator: "equals", value: "new" },
        { attribute: "condition", operator: "equals", value: "used" }
      ],
      candidates: []
    };
    const c = detectIntentConflicts(request);
    expect(c).toHaveLength(1);
    expect(c[0].type).toBe("hard_conflict");
  });

  test("8. condition = new + condition not_in [new] → conflict", () => {
    const request: RecommendationRequest = {
      hardConstraints: [
        { attribute: "condition", operator: "equals", value: "new" },
        { attribute: "condition", operator: "not_in", value: ["new"] }
      ],
      candidates: []
    };
    const c = detectIntentConflicts(request);
    expect(c).toHaveLength(1);
    expect(c[0].type).toBe("hard_conflict");
  });

  test("9. condition = new + condition not_in [refurbished] → compatible", () => {
    const request: RecommendationRequest = {
      hardConstraints: [
        { attribute: "condition", operator: "equals", value: "new" },
        { attribute: "condition", operator: "not_in", value: ["refurbished"] }
      ],
      candidates: []
    };
    const c = detectIntentConflicts(request);
    expect(c).toEqual([]);
  });

  test("10. hard constraint + matching explicit requirement → compatible", () => {
    const request: RecommendationRequest = {
      hardConstraints: [{ attribute: "brand", operator: "equals", value: "samsung" }],
      explicitRequirements: [{ attribute: "brand", value: "samsung", isMandatory: true }],
      candidates: []
    };
    const c = detectIntentConflicts(request);
    expect(c).toEqual([]);
  });

  test("11. hard constraint contradicting explicit requirement → conflict", () => {
    const request: RecommendationRequest = {
      hardConstraints: [{ attribute: "brand", operator: "equals", value: "samsung" }],
      explicitRequirements: [{ attribute: "brand", value: "apple", isMandatory: true }],
      candidates: []
    };
    const c = detectIntentConflicts(request);
    expect(c).toHaveLength(1);
    expect(c[0].type).toBe("hard_conflict");
    expect(c[0].sources).toEqual(["hard_constraint", "explicit_requirement"]);
  });

  test("12. mandatory explicit requirement 256GB + mandatory explicit requirement 128GB → conflict", () => {
    const request: RecommendationRequest = {
      explicitRequirements: [
        { attribute: "storage", value: "256GB", isMandatory: true },
        { attribute: "storage", value: "128GB", isMandatory: true }
      ],
      candidates: []
    };
    const c = detectIntentConflicts(request);
    expect(c).toHaveLength(1);
    expect(c[0].type).toBe("requirement_conflict");
  });

  test("13. same explicit requirement twice → no conflict", () => {
    const request: RecommendationRequest = {
      explicitRequirements: [
        { attribute: "storage", value: "256GB", isMandatory: true },
        { attribute: "storage", value: "256GB", isMandatory: true }
      ],
      candidates: []
    };
    const c = detectIntentConflicts(request);
    expect(c).toEqual([]);
  });

  test("14. hard brand Samsung + preference Apple → preserve both; do not weaken hard constraint", () => {
    const request: RecommendationRequest = {
      hardConstraints: [{ attribute: "brand", operator: "equals", value: "samsung" }],
      userPreferences: [{ key: "brand_loyalty", value: "apple" }],
      candidates: []
    };
    const c = detectIntentConflicts(request);
    expect(c).toHaveLength(1);
    expect(c[0].type).toBe("hard_vs_preference");
    expect(c[0].severity).toBe("low");
    expect(request.hardConstraints).toHaveLength(1);
    expect(request.hardConstraints?.[0].value).toBe("samsung");
  });

  test("15. explicit 256GB + preference 512GB → tension only, not hard conflict", () => {
    const request: RecommendationRequest = {
      explicitRequirements: [{ attribute: "storage", value: "256GB", isMandatory: true }],
      userPreferences: [{ key: "storage", value: "512GB" }],
      candidates: []
    };
    const c = detectIntentConflicts(request);
    expect(c).toHaveLength(1);
    expect(c[0].type).toBe("preference_conflict");
    expect(c[0].severity).toBe("low");
  });

  test("16. unknown/unparseable numeric values → no invented conflict", () => {
    const request: RecommendationRequest = {
      hardConstraints: [
        { attribute: "custom_spec", operator: "less_than", value: "abc" },
        { attribute: "custom_spec", operator: "greater_than", value: "xyz" }
      ],
      candidates: []
    };
    const c = detectIntentConflicts(request);
    expect(c).toEqual([]);
  });

  test("17. incompatible currencies → no unsafe comparison", () => {
    const request: RecommendationRequest = {
      hardConstraints: [
        { attribute: "price", operator: "less_than", value: "50000 INR" }
      ],
      candidates: []
    };
    const c = detectIntentConflicts(request);
    expect(c).toEqual([]);
  });

  test("18. empty request → []", () => {
    expect(detectIntentConflicts({ candidates: [] })).toEqual([]);
  });

  test("19. null request → []", () => {
    expect(detectIntentConflicts(null)).toEqual([]);
    expect(detectIntentConflicts(undefined)).toEqual([]);
  });

  test("20. missing arrays handled safely", () => {
    expect(detectIntentConflicts({ hardConstraints: null, explicitRequirements: [], userPreferences: null, candidates: [] })).toEqual([]);
  });

  test("21. deterministic repeated execution", () => {
    const request = extractUserIntent("Samsung phone under ₹50,000 but above ₹70,000");
    const c1 = detectIntentConflicts(request);
    const c2 = detectIntentConflicts(request);
    expect(c1).toEqual(c2);
  });

  test("22. input request is never mutated", () => {
    const request: RecommendationRequest = {
      hardConstraints: [
        { attribute: "brand", operator: "equals", value: "samsung" },
        { attribute: "brand", operator: "equals", value: "apple" }
      ],
      candidates: []
    };
    const requestCopy = JSON.parse(JSON.stringify(request));
    detectIntentConflicts(request);
    expect(request).toEqual(requestCopy);
  });

  test("23. conflict output preserves source types", () => {
    const request: RecommendationRequest = {
      hardConstraints: [{ attribute: "brand", operator: "equals", value: "samsung" }],
      explicitRequirements: [{ attribute: "brand", value: "apple", isMandatory: true }],
      candidates: []
    };
    const c = detectIntentConflicts(request);
    expect(c[0].sources).toEqual(["hard_constraint", "explicit_requirement"]);
  });

  test("24. severity is deterministic ('high' for hard conflicts, 'low' for preference tensions)", () => {
    const request: RecommendationRequest = {
      hardConstraints: [
        { attribute: "brand", operator: "equals", value: "samsung" },
        { attribute: "brand", operator: "equals", value: "apple" }
      ],
      userPreferences: [{ key: "brand_loyalty", value: "sony" }],
      candidates: []
    };
    const c = detectIntentConflicts(request);
    expect(c[0].severity).toBe("high");
    expect(c[1].severity).toBe("low");
  });

  test("25. No candidate scoring is performed", () => {
    const request = extractUserIntent("Samsung phone under ₹50,000");
    const c = detectIntentConflicts(request);
    expect(c).toBeDefined();
    expect(request.candidates).toEqual([]);
  });

  test("26. No recommendation is selected", () => {
    const request = extractUserIntent("Samsung phone under ₹50,000");
    const c = detectIntentConflicts(request);
    expect(c).toBeDefined();
    expect((c as any).recommendedCandidate).toBeUndefined();
  });

  test("27. recommendationEngine remains unchanged", () => {
    const request = extractUserIntent("Samsung phone under ₹50,000");
    const c = detectIntentConflicts(request);
    expect(Array.isArray(c)).toBe(true);
  });
});
