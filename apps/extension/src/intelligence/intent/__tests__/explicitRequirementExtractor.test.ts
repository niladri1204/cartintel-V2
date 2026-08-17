import { describe, test, expect } from "vitest";
import { extractExplicitRequirements } from "../explicitRequirementExtractor";
import { extractUserIntent } from "../intentExtractor";

describe("explicitRequirementExtractor - extractExplicitRequirements & Intent Integration", () => {
  test("1. 'Samsung phone with 256GB storage' → storage = 256GB", () => {
    const reqs = extractExplicitRequirements("samsung phone with 256gb storage");
    expect(reqs).toHaveLength(1);
    expect(reqs[0].attribute).toBe("storage");
    expect(reqs[0].value).toBe("256GB");
    expect(reqs[0].isMandatory).toBe(true);
  });

  test("2. 'phone with 12GB RAM' → RAM = 12GB", () => {
    const reqs = extractExplicitRequirements("phone with 12gb ram");
    expect(reqs).toHaveLength(1);
    expect(reqs[0].attribute).toBe("ram");
    expect(reqs[0].value).toBe("12GB");
    expect(reqs[0].isMandatory).toBe(true);
  });

  test("3. 'black headphones' → color = black", () => {
    const reqs = extractExplicitRequirements("black headphones");
    expect(reqs).toHaveLength(1);
    expect(reqs[0].attribute).toBe("color");
    expect(reqs[0].value).toBe("black");
    expect(reqs[0].isMandatory).toBe(true);
  });

  test("4. 'white laptop' → color = white", () => {
    const reqs = extractExplicitRequirements("white laptop");
    expect(reqs).toHaveLength(1);
    expect(reqs[0].attribute).toBe("color");
    expect(reqs[0].value).toBe("white");
    expect(reqs[0].isMandatory).toBe(true);
  });

  test("5. 'phone with 6.7 inch display' → size = 6.7 inch", () => {
    const reqs = extractExplicitRequirements("phone with 6.7 inch display");
    expect(reqs).toHaveLength(1);
    expect(reqs[0].attribute).toBe("size");
    expect(reqs[0].value).toBe("6.7 inch");
    expect(reqs[0].isMandatory).toBe(true);
  });

  test("6. '120Hz monitor' → display = 120HZ", () => {
    const reqs = extractExplicitRequirements("120hz monitor");
    expect(reqs).toHaveLength(1);
    expect(reqs[0].attribute).toBe("display");
    expect(reqs[0].value).toBe("120HZ");
    expect(reqs[0].isMandatory).toBe(true);
  });

  test("7. '4K television' → display = 4K", () => {
    const reqs = extractExplicitRequirements("4k television");
    expect(reqs).toHaveLength(1);
    expect(reqs[0].attribute).toBe("display");
    expect(reqs[0].value).toBe("4K");
    expect(reqs[0].isMandatory).toBe(true);
  });

  test("8. '5000mAh battery' → battery = 5000mAh", () => {
    const reqs = extractExplicitRequirements("5000mah battery");
    expect(reqs).toHaveLength(1);
    expect(reqs[0].attribute).toBe("battery");
    expect(reqs[0].value).toBe("5000mAh");
    expect(reqs[0].isMandatory).toBe(true);
  });

  test("9. 'pack of 4' → quantity = 4", () => {
    const reqs = extractExplicitRequirements("pack of 4");
    expect(reqs).toHaveLength(1);
    expect(reqs[0].attribute).toBe("quantity");
    expect(reqs[0].value).toBe("4");
    expect(reqs[0].isMandatory).toBe(true);
  });

  test("10. 'stainless steel' → material = stainless steel", () => {
    const reqs = extractExplicitRequirements("stainless steel watch");
    expect(reqs).toHaveLength(1);
    expect(reqs[0].attribute).toBe("material");
    expect(reqs[0].value).toBe("stainless steel");
    expect(reqs[0].isMandatory).toBe(true);
  });

  test("11. Multiple requirements are all extracted", () => {
    const reqs = extractExplicitRequirements("Samsung phone with 256GB storage, 12GB RAM and black color");
    expect(reqs).toHaveLength(3);
    const attributes = reqs.map(r => r.attribute);
    expect(attributes).toContain("storage");
    expect(attributes).toContain("ram");
    expect(attributes).toContain("color");
  });

  test("12. Requirements preserve deterministic query order", () => {
    const reqs = extractExplicitRequirements("black phone with 12GB RAM and 256GB storage");
    expect(reqs[0].attribute).toBe("color");
    expect(reqs[1].attribute).toBe("ram");
    expect(reqs[2].attribute).toBe("storage");
  });

  test("13. 'good camera' does NOT become an explicit requirement", () => {
    const reqs = extractExplicitRequirements("phone with good camera");
    expect(reqs).toEqual([]);
  });

  test("14. 'best battery' does NOT become an explicit requirement", () => {
    const reqs = extractExplicitRequirements("phone with best battery");
    expect(reqs).toEqual([]);
  });

  test("15. 'under ₹50,000' does NOT become an explicit requirement", () => {
    const reqs = extractExplicitRequirements("samsung phone under ₹50,000");
    expect(reqs).toEqual([]);
  });

  test("16. 'preferably 256GB' does NOT become a mandatory explicit requirement", () => {
    const reqs = extractExplicitRequirements("samsung phone preferably 256gb storage");
    expect(reqs).toEqual([]);
  });

  test("17. Empty query returns []", () => {
    expect(extractExplicitRequirements("")).toEqual([]);
    expect(extractExplicitRequirements("   ")).toEqual([]);
    expect(extractExplicitRequirements(null)).toEqual([]);
    expect(extractExplicitRequirements(undefined)).toEqual([]);
  });

  test("18. Unknown attributes do not produce arbitrary requirements", () => {
    const reqs = extractExplicitRequirements("random xyz 123 query");
    expect(reqs).toEqual([]);
  });

  test("19. Duplicate requirements behave deterministically (identical duplicates removed, distinct ones preserved)", () => {
    const reqs = extractExplicitRequirements("256GB storage and at least 512GB storage");
    // Preserves distinct explicit requirements in query order
    expect(reqs).toHaveLength(2);
    expect(reqs[0].value).toBe("256GB");
    expect(reqs[1].value).toBe("512GB");

    const reqsIdentical = extractExplicitRequirements("256GB storage and 256GB storage");
    // Identical tuples are deduplicated
    expect(reqsIdentical).toHaveLength(1);
  });

  test("20. extractUserIntent() correctly integrates explicitRequirements", () => {
    const request = extractUserIntent("Samsung phone with 256GB storage and 12GB RAM");
    expect(request.explicitRequirements).toHaveLength(2);
    expect(request.explicitRequirements?.[0].attribute).toBe("storage");
    expect(request.explicitRequirements?.[1].attribute).toBe("ram");
  });

  test("21. ProductContext remains separate from explicitRequirements", () => {
    const request = extractUserIntent("Samsung phone with 256GB storage");
    expect(request.productContext).toEqual({ category: "smartphone", brand: "samsung" });
    expect(request.explicitRequirements).toHaveLength(1);
    expect(request.explicitRequirements?.[0].attribute).toBe("storage");
    expect(JSON.stringify(request.productContext)).not.toContain("256GB");
  });

  test("22. Existing RecommendationRequest remains valid", () => {
    const request = extractUserIntent("black phone with 12GB RAM");
    expect(request).toHaveProperty("originalQuery");
    expect(request).toHaveProperty("normalizedQuery");
    expect(request).toHaveProperty("productContext");
    expect(request).toHaveProperty("explicitRequirements");
    expect(request).toHaveProperty("userPreferences");
    expect(request).toHaveProperty("hardConstraints");
    expect(request).toHaveProperty("candidates");
  });

  test("23. Existing recommendationEngine behavior remains unaffected", () => {
    const request = extractUserIntent("Samsung phone with 256GB storage");
    expect(request.candidates).toEqual([]);
    expect(request.userPreferences).toEqual([]);
    expect(request.hardConstraints).toEqual([]);
  });
});
