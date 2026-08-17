import { describe, test, expect } from "vitest";
import { extractUserPreferences } from "../userPreferenceExtractor";
import { extractUserIntent } from "../intentExtractor";

describe("userPreferenceExtractor - extractUserPreferences & Intent Integration", () => {
  test("1. 'prefer Samsung' → brand_loyalty = samsung", () => {
    const p = extractUserPreferences("prefer samsung");
    expect(p).toHaveLength(1);
    expect(p[0].key).toBe("brand_loyalty");
    expect(p[0].value).toBe("samsung");
  });

  test("2. 'preferably Samsung' → brand_loyalty = samsung", () => {
    const p = extractUserPreferences("preferably samsung");
    expect(p).toHaveLength(1);
    expect(p[0].key).toBe("brand_loyalty");
    expect(p[0].value).toBe("samsung");
  });

  test("3. 'Samsung preferred' → brand_loyalty = samsung", () => {
    const p = extractUserPreferences("samsung preferred");
    expect(p).toHaveLength(1);
    expect(p[0].key).toBe("brand_loyalty");
    expect(p[0].value).toBe("samsung");
  });

  test("4. 'I would like Samsung' → brand_loyalty = samsung", () => {
    const p = extractUserPreferences("i would like samsung");
    expect(p).toHaveLength(1);
    expect(p[0].key).toBe("brand_loyalty");
    expect(p[0].value).toBe("samsung");
  });

  test("5. 'good camera' → camera = preferred", () => {
    const p = extractUserPreferences("phone with good camera");
    expect(p).toHaveLength(1);
    expect(p[0].key).toBe("camera");
    expect(p[0].value).toBe("preferred");
  });

  test("6. 'better camera' → camera = preferred", () => {
    const p = extractUserPreferences("phone with better camera");
    expect(p).toHaveLength(1);
    expect(p[0].key).toBe("camera");
    expect(p[0].value).toBe("preferred");
  });

  test("7. 'best camera' → camera = preferred", () => {
    const p = extractUserPreferences("phone with best camera");
    expect(p).toHaveLength(1);
    expect(p[0].key).toBe("camera");
    expect(p[0].value).toBe("preferred");
  });

  test("8. 'good battery' → battery = preferred", () => {
    const p = extractUserPreferences("phone with good battery");
    expect(p).toHaveLength(1);
    expect(p[0].key).toBe("battery");
    expect(p[0].value).toBe("preferred");
  });

  test("9. 'best battery' → battery = preferred", () => {
    const p = extractUserPreferences("phone with best battery");
    expect(p).toHaveLength(1);
    expect(p[0].key).toBe("battery");
    expect(p[0].value).toBe("preferred");
  });

  test("10. 'long battery life' → battery = preferred", () => {
    const p = extractUserPreferences("phone with long battery life");
    expect(p).toHaveLength(1);
    expect(p[0].key).toBe("battery");
    expect(p[0].value).toBe("preferred");
  });

  test("11. 'good performance' → performance = preferred", () => {
    const p = extractUserPreferences("laptop with good performance");
    expect(p).toHaveLength(1);
    expect(p[0].key).toBe("performance");
    expect(p[0].value).toBe("preferred");
  });

  test("12. 'fast performance' → performance = preferred", () => {
    const p = extractUserPreferences("laptop with fast performance");
    expect(p).toHaveLength(1);
    expect(p[0].key).toBe("performance");
    expect(p[0].value).toBe("preferred");
  });

  test("13. 'better display' → display = preferred", () => {
    const p = extractUserPreferences("phone with better display");
    expect(p).toHaveLength(1);
    expect(p[0].key).toBe("display");
    expect(p[0].value).toBe("preferred");
  });

  test("14. 'cheap phone' → price_sensitivity = high", () => {
    const p = extractUserPreferences("cheap phone");
    expect(p).toHaveLength(1);
    expect(p[0].key).toBe("price_sensitivity");
    expect(p[0].value).toBe("high");
  });

  test("15. 'affordable laptop' → price_sensitivity = high", () => {
    const p = extractUserPreferences("affordable laptop");
    expect(p).toHaveLength(1);
    expect(p[0].key).toBe("price_sensitivity");
    expect(p[0].value).toBe("high");
  });

  test("16. 'budget friendly phone' → price_sensitivity = high", () => {
    const p = extractUserPreferences("budget friendly phone");
    expect(p).toHaveLength(1);
    expect(p[0].key).toBe("price_sensitivity");
    expect(p[0].value).toBe("high");
  });

  test("17. 'value for money' → value = high", () => {
    const p = extractUserPreferences("value for money phone");
    expect(p).toHaveLength(1);
    expect(p[0].key).toBe("value");
    expect(p[0].value).toBe("high");
  });

  test("18. 'best value' → value = high", () => {
    const p = extractUserPreferences("best value phone");
    expect(p).toHaveLength(1);
    expect(p[0].key).toBe("value");
    expect(p[0].value).toBe("high");
  });

  test("19. 'reliable laptop' → reliability = preferred", () => {
    const p = extractUserPreferences("reliable laptop");
    expect(p).toHaveLength(1);
    expect(p[0].key).toBe("reliability");
    expect(p[0].value).toBe("preferred");
  });

  test("20. 'durable phone' → durability = preferred", () => {
    const p = extractUserPreferences("durable phone");
    expect(p).toHaveLength(1);
    expect(p[0].key).toBe("durability");
    expect(p[0].value).toBe("preferred");
  });

  test("21. 'premium quality' → quality = preferred", () => {
    const p = extractUserPreferences("phone with premium quality");
    expect(p).toHaveLength(1);
    expect(p[0].key).toBe("quality");
    expect(p[0].value).toBe("preferred");
  });

  test("22. 'preferably 256GB' → storage = 256GB", () => {
    const p = extractUserPreferences("phone preferably 256gb storage");
    expect(p).toHaveLength(1);
    expect(p[0].key).toBe("storage");
    expect(p[0].value).toBe("256GB");
  });

  test("23. 'ideally 512GB' → storage = 512GB", () => {
    const p = extractUserPreferences("phone ideally 512gb storage");
    expect(p).toHaveLength(1);
    expect(p[0].key).toBe("storage");
    expect(p[0].value).toBe("512GB");
  });

  test("24. 'would like 16GB RAM' → ram = 16GB", () => {
    const p = extractUserPreferences("laptop would like 16gb ram");
    expect(p).toHaveLength(1);
    expect(p[0].key).toBe("ram");
    expect(p[0].value).toBe("16GB");
  });

  test("25. 'only Samsung' → hard constraint, not preference", () => {
    const p = extractUserPreferences("only samsung");
    expect(p).toEqual([]);
  });

  test("26. 'must be Samsung' → hard constraint, not preference", () => {
    const p = extractUserPreferences("must be samsung");
    expect(p).toEqual([]);
  });

  test("27. 'under ₹50,000' → hard constraint, not preference", () => {
    const p = extractUserPreferences("under ₹50,000");
    expect(p).toEqual([]);
  });

  test("28. 'at least 256GB' → hard constraint/explicit requirement, not soft preference", () => {
    const p = extractUserPreferences("at least 256gb storage");
    expect(p).toEqual([]);
  });

  test("29. Mixed query preserves productContext, hardConstraints, and userPreferences", () => {
    const request = extractUserIntent("Samsung phone under ₹50,000, preferably 256GB with a good camera");

    expect(request.productContext).toEqual({ category: "smartphone", brand: "samsung" });
    expect(request.hardConstraints).toEqual([
      { attribute: "price", operator: "less_than", value: 50000 }
    ]);
    expect(request.userPreferences).toHaveLength(2);
    expect(request.userPreferences?.[0].key).toBe("storage");
    expect(request.userPreferences?.[0].value).toBe("256GB");
    expect(request.userPreferences?.[1].key).toBe("camera");
    expect(request.userPreferences?.[1].value).toBe("preferred");
  });

  test("30. Explicit requirements remain unchanged", () => {
    const request = extractUserIntent("Samsung phone with 256GB storage and a good camera");
    expect(request.explicitRequirements).toEqual([
      { attribute: "storage", value: "256GB", operator: "equals", isMandatory: true }
    ]);
    expect(request.userPreferences).toHaveLength(1);
    expect(request.userPreferences?.[0].key).toBe("camera");
  });

  test("31. Deterministic query order is preserved", () => {
    const p = extractUserPreferences("good camera and long battery life");
    expect(p).toHaveLength(2);
    expect(p[0].key).toBe("camera");
    expect(p[1].key).toBe("battery");
  });

  test("32. Empty/null query returns []", () => {
    expect(extractUserPreferences("")).toEqual([]);
    expect(extractUserPreferences("   ")).toEqual([]);
    expect(extractUserPreferences(null)).toEqual([]);
    expect(extractUserPreferences(undefined)).toEqual([]);
  });

  test("33. Unknown subjective wording does not invent preferences", () => {
    expect(extractUserPreferences("random query xyz")).toEqual([]);
  });

  test("34. 'best phone' does not invent a camera/battery preference", () => {
    const p = extractUserPreferences("best phone under ₹50,000");
    expect(p).toEqual([]);
  });

  test("35. Duplicate identical preferences behave deterministically", () => {
    const p = extractUserPreferences("good camera and good camera");
    expect(p).toHaveLength(1);
  });

  test("36. Conflicting preferences are preserved rather than silently resolved", () => {
    const p = extractUserPreferences("cheap phone with premium quality");
    expect(p).toHaveLength(2);
    expect(p[0].key).toBe("price_sensitivity");
    expect(p[1].key).toBe("quality");
  });

  test("37. Existing RecommendationRequest remains valid", () => {
    const request = extractUserIntent("good camera");
    expect(request).toHaveProperty("originalQuery");
    expect(request).toHaveProperty("normalizedQuery");
    expect(request).toHaveProperty("userPreferences");
  });

  test("38. Existing recommendationEngine remains unaffected", () => {
    const request = extractUserIntent("good camera");
    expect(request.candidates).toEqual([]);
  });
});
