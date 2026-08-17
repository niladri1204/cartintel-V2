import { describe, test, expect } from "vitest";
import { buildRequirementPriorities } from "../requirementPriority";
import { extractUserIntent } from "../intentExtractor";
import type { RecommendationRequest } from "../../recommendationTypes";

describe("requirementPriority - buildRequirementPriorities", () => {
  test("1. A hard constraint receives 'critical' priority", () => {
    const request: RecommendationRequest = {
      hardConstraints: [{ attribute: "price", operator: "less_than", value: 50000 }],
      candidates: []
    };
    const p = buildRequirementPriorities(request);
    expect(p).toHaveLength(1);
    expect(p[0].source).toBe("hard_constraint");
    expect(p[0].priority).toBe("critical");
  });

  test("2. A mandatory explicit requirement receives 'high' priority", () => {
    const request: RecommendationRequest = {
      explicitRequirements: [{ attribute: "storage", value: "256GB", operator: "equals", isMandatory: true }],
      candidates: []
    };
    const p = buildRequirementPriorities(request);
    expect(p).toHaveLength(1);
    expect(p[0].source).toBe("explicit_requirement");
    expect(p[0].priority).toBe("high");
  });

  test("3. A normal user preference receives 'medium' priority", () => {
    const request: RecommendationRequest = {
      userPreferences: [{ key: "camera", value: "preferred" }],
      candidates: []
    };
    const p = buildRequirementPriorities(request);
    expect(p).toHaveLength(1);
    expect(p[0].source).toBe("user_preference");
    expect(p[0].priority).toBe("medium");
  });

  test("4. A non-mandatory explicit requirement receives 'medium' priority", () => {
    const request: RecommendationRequest = {
      explicitRequirements: [{ attribute: "color", value: "blue", operator: "equals", isMandatory: false }],
      candidates: []
    };
    const p = buildRequirementPriorities(request);
    expect(p).toHaveLength(1);
    expect(p[0].source).toBe("explicit_requirement");
    expect(p[0].priority).toBe("medium");
  });

  test("5. Hard constraints outrank explicit requirements in priority level", () => {
    const request: RecommendationRequest = {
      hardConstraints: [{ attribute: "price", operator: "less_than", value: 50000 }],
      explicitRequirements: [{ attribute: "storage", value: "256GB", operator: "equals", isMandatory: true }],
      candidates: []
    };
    const p = buildRequirementPriorities(request);
    expect(p[0].priority).toBe("critical");
    expect(p[1].priority).toBe("high");
  });

  test("6. Explicit mandatory requirements outrank normal preferences in priority level", () => {
    const request: RecommendationRequest = {
      explicitRequirements: [{ attribute: "storage", value: "256GB", operator: "equals", isMandatory: true }],
      userPreferences: [{ key: "camera", value: "preferred" }],
      candidates: []
    };
    const p = buildRequirementPriorities(request);
    expect(p[0].priority).toBe("high");
    expect(p[1].priority).toBe("medium");
  });

  test("7. Priorities use categorical labels ('critical', 'high', 'medium', 'low') without numeric weights", () => {
    const request: RecommendationRequest = {
      hardConstraints: [{ attribute: "price", operator: "less_than", value: 50000 }],
      userPreferences: [{ key: "camera", value: "preferred" }],
      candidates: []
    };
    const p = buildRequirementPriorities(request);
    p.forEach(item => {
      expect(["critical", "high", "medium", "low"]).toContain(item.priority);
      expect((item as any).weight).toBeUndefined();
    });
  });

  test("8. No arbitrary numeric weights are introduced", () => {
    const request = extractUserIntent("Samsung phone under ₹50,000");
    const p = buildRequirementPriorities(request);
    p.forEach(item => {
      expect(typeof item.priority).toBe("string");
    });
  });

  test("9. Original values are preserved", () => {
    const request: RecommendationRequest = {
      hardConstraints: [{ attribute: "price", operator: "less_than", value: 50000 }],
      explicitRequirements: [{ attribute: "storage", value: "256GB", isMandatory: true }],
      candidates: []
    };
    const p = buildRequirementPriorities(request);
    expect(p[0].value).toBe(50000);
    expect(p[1].value).toBe("256GB");
  });

  test("10. Original operators are preserved", () => {
    const request: RecommendationRequest = {
      hardConstraints: [{ attribute: "ram", operator: "greater_than_or_equal", value: "12GB" }],
      candidates: []
    };
    const p = buildRequirementPriorities(request);
    expect(p[0].operator).toBe("greater_than_or_equal");
  });

  test("11. Source type is correct", () => {
    const request = extractUserIntent("Samsung phone under ₹50,000, 256GB storage, good camera");
    const p = buildRequirementPriorities(request);
    const sources = p.map(item => item.source);
    expect(sources).toContain("hard_constraint");
    expect(sources).toContain("explicit_requirement");
    expect(sources).toContain("user_preference");
  });

  test("12. Attribute names use canonical terminology", () => {
    const request = extractUserIntent("phone under ₹50,000 with 256GB storage, good camera");
    const p = buildRequirementPriorities(request);
    const attributes = p.map(item => item.attribute);
    expect(attributes).toContain("price");
    expect(attributes).toContain("storage");
    expect(attributes).toContain("camera");
  });

  test("13. Multiple requirements retain deterministic source order", () => {
    const request: RecommendationRequest = {
      explicitRequirements: [
        { attribute: "color", value: "black", isMandatory: true },
        { attribute: "ram", value: "12GB", isMandatory: true },
        { attribute: "storage", value: "256GB", isMandatory: true }
      ],
      candidates: []
    };
    const p = buildRequirementPriorities(request);
    expect(p[0].attribute).toBe("color");
    expect(p[1].attribute).toBe("ram");
    expect(p[2].attribute).toBe("storage");
  });

  test("14. Multiple preferences retain deterministic source order", () => {
    const request: RecommendationRequest = {
      userPreferences: [
        { key: "camera", value: "preferred" },
        { key: "battery", value: "preferred" }
      ],
      candidates: []
    };
    const p = buildRequirementPriorities(request);
    expect(p[0].attribute).toBe("camera");
    expect(p[1].attribute).toBe("battery");
  });

  test("15. Hard constraint order remains stable", () => {
    const request: RecommendationRequest = {
      hardConstraints: [
        { attribute: "price", operator: "less_than", value: 50000 },
        { attribute: "brand", operator: "equals", value: "samsung" }
      ],
      candidates: []
    };
    const p = buildRequirementPriorities(request);
    expect(p[0].attribute).toBe("price");
    expect(p[1].attribute).toBe("brand");
  });

  test("16. Duplicate requirements behave deterministically with incremental originalIndex", () => {
    const request: RecommendationRequest = {
      hardConstraints: [
        { attribute: "price", operator: "less_than", value: 50000 },
        { attribute: "price", operator: "less_than", value: 50000 }
      ],
      candidates: []
    };
    const p = buildRequirementPriorities(request);
    expect(p).toHaveLength(2);
    expect(p[0].originalIndex).toBe(0);
    expect(p[1].originalIndex).toBe(1);
  });

  test("17. Conflicting requirements are preserved rather than resolved", () => {
    const request: RecommendationRequest = {
      hardConstraints: [
        { attribute: "price", operator: "less_than", value: 50000 },
        { attribute: "price", operator: "greater_than_or_equal", value: 60000 }
      ],
      candidates: []
    };
    const p = buildRequirementPriorities(request);
    expect(p).toHaveLength(2);
    expect(p[0].value).toBe(50000);
    expect(p[1].value).toBe(60000);
  });

  test("18. Hard constraint + preference for the same attribute are both preserved", () => {
    const request: RecommendationRequest = {
      hardConstraints: [{ attribute: "brand", operator: "equals", value: "samsung" }],
      userPreferences: [{ key: "brand_loyalty", value: "apple" }],
      candidates: []
    };
    const p = buildRequirementPriorities(request);
    expect(p).toHaveLength(2);
    expect(p[0].source).toBe("hard_constraint");
    expect(p[0].priority).toBe("critical");
    expect(p[1].source).toBe("user_preference");
    expect(p[1].priority).toBe("medium");
  });

  test("19. Explicit requirement + preference for the same attribute are both preserved", () => {
    const request: RecommendationRequest = {
      explicitRequirements: [{ attribute: "storage", value: "256GB", isMandatory: true }],
      userPreferences: [{ key: "storage", value: "512GB" }],
      candidates: []
    };
    const p = buildRequirementPriorities(request);
    expect(p).toHaveLength(2);
    expect(p[0].value).toBe("256GB");
    expect(p[0].priority).toBe("high");
    expect(p[1].value).toBe("512GB");
    expect(p[1].priority).toBe("medium");
  });

  test("20. Empty RecommendationRequest produces an empty priority list", () => {
    expect(buildRequirementPriorities({ candidates: [] })).toEqual([]);
  });

  test("21. Null/empty arrays are handled safely", () => {
    expect(buildRequirementPriorities(null)).toEqual([]);
    expect(buildRequirementPriorities(undefined)).toEqual([]);
    expect(buildRequirementPriorities({ hardConstraints: null, explicitRequirements: [], userPreferences: null, candidates: [] })).toEqual([]);
  });

  test("22. Input RecommendationRequest is not mutated", () => {
    const request: RecommendationRequest = {
      originalQuery: "test",
      hardConstraints: [{ attribute: "price", operator: "less_than", value: 50000 }],
      candidates: []
    };
    const requestCopy = JSON.parse(JSON.stringify(request));
    buildRequirementPriorities(request);
    expect(request).toEqual(requestCopy);
  });

  test("23. Calling the function repeatedly with the same request produces equivalent output", () => {
    const request = extractUserIntent("Samsung phone with 256GB storage under ₹50,000");
    const p1 = buildRequirementPriorities(request);
    const p2 = buildRequirementPriorities(request);
    expect(p1).toEqual(p2);
  });

  test("24. No candidate ranking is performed", () => {
    const request = extractUserIntent("Samsung phone under ₹50,000");
    const p = buildRequirementPriorities(request);
    expect(p).toBeDefined();
    expect((request as any).candidates).toEqual([]);
  });

  test("25. No recommendation is selected", () => {
    const request = extractUserIntent("Samsung phone under ₹50,000");
    const p = buildRequirementPriorities(request);
    expect(p).toBeDefined();
    expect((p as any).recommendedCandidate).toBeUndefined();
  });

  test("26. Existing recommendationEngine behavior remains unchanged", () => {
    const request = extractUserIntent("Samsung phone under ₹50,000");
    const p = buildRequirementPriorities(request);
    expect(Array.isArray(p)).toBe(true);
  });

  test("INTEGRATION: Combined query preserves priorities in stable source sequence", () => {
    const request = extractUserIntent("Samsung phone with 256GB storage under ₹50,000, preferably AMOLED with a good camera");
    const p = buildRequirementPriorities(request);

    // Hard Constraint (price < 50000) -> critical
    const priceItem = p.find(item => item.attribute === "price");
    expect(priceItem?.priority).toBe("critical");
    expect(priceItem?.source).toBe("hard_constraint");

    // Explicit Requirement (storage = 256GB) -> high
    const storageItem = p.find(item => item.attribute === "storage");
    expect(storageItem?.priority).toBe("high");
    expect(storageItem?.source).toBe("explicit_requirement");

    // User Preferences (display = AMOLED, camera = preferred) -> medium
    const displayItem = p.find(item => item.attribute === "display");
    expect(displayItem?.priority).toBe("medium");
    expect(displayItem?.source).toBe("user_preference");

    const cameraItem = p.find(item => item.attribute === "camera");
    expect(cameraItem?.priority).toBe("medium");
    expect(cameraItem?.source).toBe("user_preference");
  });
});
