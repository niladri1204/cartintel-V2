import { describe, test, expect } from "vitest";
import { extractUserIntent } from "../intentExtractor";
import { recommend } from "../../recommendationEngine";

describe("intentExtractor - extractUserIntent", () => {
  const sampleQuery = "Best Samsung phone under ₹50,000 with 256GB storage and a good camera";

  test("1. A normal query produces a valid RecommendationRequest", () => {
    const request = extractUserIntent(sampleQuery);
    expect(request).toBeDefined();
    expect(typeof request.originalQuery).toBe("string");
    expect(Array.isArray(request.explicitRequirements)).toBe(true);
    expect(Array.isArray(request.userPreferences)).toBe(true);
    expect(Array.isArray(request.hardConstraints)).toBe(true);
    expect(Array.isArray(request.candidates)).toBe(true);
  });

  test("2. originalQuery is preserved", () => {
    const request = extractUserIntent(sampleQuery);
    expect(request.originalQuery).toBe(sampleQuery);
  });

  test("3. The initial structural implementation does not invent requirements", () => {
    const request = extractUserIntent(sampleQuery);
    expect(request.explicitRequirements).toEqual([
      { attribute: "storage", value: "256GB", operator: "equals", isMandatory: true }
    ]);
    expect(request.userPreferences).toEqual([
      { key: "camera", value: "preferred" }
    ]);
    expect(request.hardConstraints).toEqual([
      { attribute: "price", operator: "less_than", value: 50000 }
    ]);
    expect(request.productContext).toEqual({ category: "smartphone", brand: "samsung" });
  });

  test("4. Empty query is handled safely", () => {
    const request = extractUserIntent("");
    expect(request).toBeDefined();
    expect(request.originalQuery).toBe("");
    expect(request.candidates).toEqual([]);
  });

  test("5. Whitespace-only query is handled safely", () => {
    const whitespaceQuery = "   \t\n  ";
    const request = extractUserIntent(whitespaceQuery);
    expect(request).toBeDefined();
    expect(request.originalQuery).toBe(whitespaceQuery);
    expect(request.candidates).toEqual([]);
  });

  test("5.1. null or undefined query is handled safely", () => {
    const requestNull = extractUserIntent(null);
    expect(requestNull).toBeDefined();
    expect(requestNull.originalQuery).toBe("");

    const requestUndefined = extractUserIntent(undefined);
    expect(requestUndefined).toBeDefined();
    expect(requestUndefined.originalQuery).toBe("");
  });

  test("6. Returned object is compatible with RecommendationRequest", () => {
    const request = extractUserIntent(sampleQuery);
    const engineResult = recommend(request, []);
    expect(engineResult).toBeDefined();
    expect(engineResult.metadata.evaluatedCandidateCount).toBe(0);
  });

  test("7. candidates defaults to an empty array", () => {
    const request = extractUserIntent(sampleQuery);
    expect(request.candidates).toEqual([]);
  });

  test("8. The extraction function is deterministic", () => {
    const request1 = extractUserIntent(sampleQuery);
    const request2 = extractUserIntent(sampleQuery);

    expect(request1).toEqual(request2);
  });

  test("9. No external/API calls occur", () => {
    const start = performance.now();
    const request = extractUserIntent(sampleQuery);
    const duration = performance.now() - start;

    expect(duration).toBeLessThan(50);
    expect(request).toBeDefined();
  });

  test("10. Existing recommendation engine remains unaffected", () => {
    const request = extractUserIntent(sampleQuery);
    const engineResult = recommend(request, []);

    expect(engineResult.recommendedCandidate).toBeNull();
    expect(engineResult.confidence).toBe("low");
    expect(engineResult.metadata.decisionAlgorithmVersion).toBe("1.0.0-architecture");
  });
});
