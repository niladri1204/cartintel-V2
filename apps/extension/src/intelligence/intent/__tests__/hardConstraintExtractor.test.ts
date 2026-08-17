import { describe, test, expect } from "vitest";
import { extractHardConstraints, parsePriceThreshold } from "../hardConstraintExtractor";
import { extractUserIntent } from "../intentExtractor";

describe("hardConstraintExtractor - extractHardConstraints & Intent Integration", () => {
  test("Price parsing helper: parsePriceThreshold handles 50000, 50k, 1 lakh, 1.5L", () => {
    expect(parsePriceThreshold("₹50,000")).toBe(50000);
    expect(parsePriceThreshold("50k")).toBe(50000);
    expect(parsePriceThreshold("50 K")).toBe(50000);
    expect(parsePriceThreshold("1 lakh")).toBe(100000);
    expect(parsePriceThreshold("₹1.5 lakh")).toBe(150000);
    expect(parsePriceThreshold("1.5L")).toBe(150000);
  });

  test("1. 'under ₹50,000' → price less_than 50000", () => {
    const c = extractHardConstraints("under ₹50,000");
    expect(c).toHaveLength(1);
    expect(c[0].attribute).toBe("price");
    expect(c[0].operator).toBe("less_than");
    expect(c[0].value).toBe(50000);
  });

  test("2. 'below ₹50,000' → price less_than 50000", () => {
    const c = extractHardConstraints("below ₹50,000");
    expect(c).toHaveLength(1);
    expect(c[0].operator).toBe("less_than");
    expect(c[0].value).toBe(50000);
  });

  test("3. 'less than ₹50,000' → price less_than 50000", () => {
    const c = extractHardConstraints("less than ₹50,000");
    expect(c).toHaveLength(1);
    expect(c[0].operator).toBe("less_than");
    expect(c[0].value).toBe(50000);
  });

  test("4. 'maximum ₹50,000' → price less_than_or_equal 50000", () => {
    const c = extractHardConstraints("maximum ₹50,000");
    expect(c).toHaveLength(1);
    expect(c[0].operator).toBe("less_than_or_equal");
    expect(c[0].value).toBe(50000);
  });

  test("5. 'max ₹50,000' → price less_than_or_equal 50000", () => {
    const c = extractHardConstraints("max ₹50,000");
    expect(c).toHaveLength(1);
    expect(c[0].operator).toBe("less_than_or_equal");
    expect(c[0].value).toBe(50000);
  });

  test("6. 'up to ₹50,000' → price less_than_or_equal 50000", () => {
    const c = extractHardConstraints("up to ₹50,000");
    expect(c).toHaveLength(1);
    expect(c[0].operator).toBe("less_than_or_equal");
    expect(c[0].value).toBe(50000);
  });

  test("7. 'under 50k' → price less_than 50000", () => {
    const c = extractHardConstraints("under 50k");
    expect(c).toHaveLength(1);
    expect(c[0].operator).toBe("less_than");
    expect(c[0].value).toBe(50000);
  });

  test("8. 'under ₹1 lakh' → price less_than 100000", () => {
    const c = extractHardConstraints("under ₹1 lakh");
    expect(c).toHaveLength(1);
    expect(c[0].value).toBe(100000);
  });

  test("9. 'under ₹1.5 lakh' → price less_than 150000", () => {
    const c = extractHardConstraints("under ₹1.5 lakh");
    expect(c).toHaveLength(1);
    expect(c[0].value).toBe(150000);
  });

  test("10. 'at least 12GB RAM' → ram greater_than_or_equal 12GB", () => {
    const c = extractHardConstraints("at least 12gb ram");
    expect(c).toHaveLength(1);
    expect(c[0].attribute).toBe("ram");
    expect(c[0].operator).toBe("greater_than_or_equal");
    expect(c[0].value).toBe("12GB");
  });

  test("11. 'minimum 16GB RAM' → ram greater_than_or_equal 16GB", () => {
    const c = extractHardConstraints("minimum 16gb ram");
    expect(c).toHaveLength(1);
    expect(c[0].attribute).toBe("ram");
    expect(c[0].operator).toBe("greater_than_or_equal");
    expect(c[0].value).toBe("16GB");
  });

  test("12. 'no more than 2kg' → weight less_than_or_equal 2kg", () => {
    const c = extractHardConstraints("no more than 2kg");
    expect(c).toHaveLength(1);
    expect(c[0].attribute).toBe("weight");
    expect(c[0].operator).toBe("less_than_or_equal");
    expect(c[0].value).toBe("2kg");
  });

  test("13. 'maximum 15 inch' → size less_than_or_equal 15 inch", () => {
    const c = extractHardConstraints("maximum 15 inch");
    expect(c).toHaveLength(1);
    expect(c[0].attribute).toBe("size");
    expect(c[0].operator).toBe("less_than_or_equal");
    expect(c[0].value).toBe("15 inch");
  });

  test("14. 'exactly black' → color equals black", () => {
    const c = extractHardConstraints("exactly black");
    expect(c).toHaveLength(1);
    expect(c[0].attribute).toBe("color");
    expect(c[0].operator).toBe("equals");
    expect(c[0].value).toBe("black");
  });

  test("15. 'must be black' → color equals black", () => {
    const c = extractHardConstraints("must be black");
    expect(c).toHaveLength(1);
    expect(c[0].attribute).toBe("color");
    expect(c[0].operator).toBe("equals");
    expect(c[0].value).toBe("black");
  });

  test("16. 'Samsung only' → brand equals samsung", () => {
    const c = extractHardConstraints("samsung only");
    expect(c).toHaveLength(1);
    expect(c[0].attribute).toBe("brand");
    expect(c[0].operator).toBe("equals");
    expect(c[0].value).toBe("samsung");
  });

  test("17. 'only Samsung' → brand equals samsung", () => {
    const c = extractHardConstraints("only samsung");
    expect(c).toHaveLength(1);
    expect(c[0].attribute).toBe("brand");
    expect(c[0].operator).toBe("equals");
    expect(c[0].value).toBe("samsung");
  });

  test("18. 'must be Samsung' → brand equals samsung", () => {
    const c = extractHardConstraints("must be samsung");
    expect(c).toHaveLength(1);
    expect(c[0].attribute).toBe("brand");
    expect(c[0].operator).toBe("equals");
    expect(c[0].value).toBe("samsung");
  });

  test("19. 'new only' → condition equals new", () => {
    const c = extractHardConstraints("new only");
    expect(c).toHaveLength(1);
    expect(c[0].attribute).toBe("condition");
    expect(c[0].operator).toBe("equals");
    expect(c[0].value).toBe("new");
  });

  test("20. 'brand new' → condition equals new", () => {
    const c = extractHardConstraints("brand new");
    expect(c).toHaveLength(1);
    expect(c[0].attribute).toBe("condition");
    expect(c[0].operator).toBe("equals");
    expect(c[0].value).toBe("new");
  });

  test("21. 'no refurbished' → condition not_in refurbished", () => {
    const c = extractHardConstraints("no refurbished");
    expect(c).toHaveLength(1);
    expect(c[0].attribute).toBe("condition");
    expect(c[0].operator).toBe("not_in");
    expect(c[0].value).toEqual(["refurbished"]);
  });

  test("22. 'not refurbished' → condition not_in refurbished", () => {
    const c = extractHardConstraints("not refurbished");
    expect(c).toHaveLength(1);
    expect(c[0].attribute).toBe("condition");
    expect(c[0].operator).toBe("not_in");
    expect(c[0].value).toEqual(["refurbished"]);
  });

  test("23. 'preferably under ₹50,000' does NOT become a hard constraint", () => {
    const c = extractHardConstraints("preferably under ₹50,000");
    expect(c).toEqual([]);
  });

  test("24. 'preferably Samsung' does NOT become a hard brand constraint", () => {
    const c = extractHardConstraints("preferably samsung");
    expect(c).toEqual([]);
  });

  test("25. 'good camera' does NOT become a hard constraint", () => {
    const c = extractHardConstraints("phone with good camera");
    expect(c).toEqual([]);
  });

  test("26. Combined query preserves productContext, explicitRequirements, and hardConstraints", () => {
    const request = extractUserIntent("Samsung phone with 256GB storage under ₹50,000");

    expect(request.productContext).toEqual({ category: "smartphone", brand: "samsung" });
    expect(request.explicitRequirements).toEqual([
      { attribute: "storage", value: "256GB", operator: "equals", isMandatory: true }
    ]);
    expect(request.hardConstraints).toEqual([
      { attribute: "price", operator: "less_than", value: 50000 }
    ]);
  });

  test("27. Existing explicit requirements remain unchanged when hardConstraints are added", () => {
    const request = extractUserIntent("at least 12GB RAM");
    expect(request.explicitRequirements).toHaveLength(1);
    expect(request.explicitRequirements?.[0].attribute).toBe("ram");
    expect(request.hardConstraints).toHaveLength(1);
    expect(request.hardConstraints?.[0].attribute).toBe("ram");
  });

  test("28. Deterministic ordering is preserved", () => {
    const c = extractHardConstraints("under ₹50,000 and at least 12GB RAM");
    expect(c).toHaveLength(2);
    expect(c[0].attribute).toBe("price");
    expect(c[1].attribute).toBe("ram");
  });

  test("29. Empty query returns []", () => {
    expect(extractHardConstraints("")).toEqual([]);
    expect(extractHardConstraints("   ")).toEqual([]);
    expect(extractHardConstraints(null)).toEqual([]);
    expect(extractHardConstraints(undefined)).toEqual([]);
  });

  test("30. Unknown constraints do not invent arbitrary attributes", () => {
    expect(extractHardConstraints("random query xyz")).toEqual([]);
  });

  test("31. Duplicate identical constraints behave deterministically", () => {
    const c = extractHardConstraints("under ₹50,000 and under ₹50,000");
    expect(c).toHaveLength(1);
  });

  test("32. Conflicting constraints are preserved rather than silently discarded", () => {
    const c = extractHardConstraints("under ₹50,000 but at least ₹60,000");
    expect(c).toHaveLength(2);
    expect(c[0].attribute).toBe("price");
    expect(c[0].operator).toBe("less_than");
    expect(c[0].value).toBe(50000);

    expect(c[1].attribute).toBe("price");
    expect(c[1].operator).toBe("greater_than_or_equal");
    expect(c[1].value).toBe(60000);
  });
});
