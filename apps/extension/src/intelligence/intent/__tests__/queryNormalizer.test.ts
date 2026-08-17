import { describe, test, expect } from "vitest";
import { normalizeQuery } from "../queryNormalizer";
import { extractUserIntent } from "../intentExtractor";

describe("queryNormalizer - normalizeQuery & Intent Integration", () => {
  test("1. Leading and trailing whitespace is removed", () => {
    expect(normalizeQuery("   best phone   ")).toBe("best phone");
  });

  test("2. Repeated whitespace is collapsed", () => {
    expect(normalizeQuery("best    samsung     phone")).toBe("best samsung phone");
  });

  test("3. Uppercase natural language is normalized appropriately", () => {
    expect(normalizeQuery("SAMSUNG PHONE")).toBe("samsung phone");
  });

  test("4. Product model identifiers remain semantically intact (RTX 4070, iPhone 15 Pro)", () => {
    expect(normalizeQuery("RTX 4070")).toBe("rtx 4070");
    expect(normalizeQuery("iPhone 15 Pro")).toBe("iphone 15 pro");
  });

  test("5. S25+ remains recognizable", () => {
    expect(normalizeQuery("S25+")).toBe("s25+");
  });

  test("6. Wi-Fi 7 remains recognizable", () => {
    expect(normalizeQuery("Wi-Fi 7")).toBe("wi-fi 7");
  });

  test("7. USB-C remains recognizable", () => {
    expect(normalizeQuery("USB-C")).toBe("usb-c");
  });

  test("8. Numeric specifications remain intact (256GB, 12GB, 120Hz, 5G, 2026)", () => {
    expect(normalizeQuery("256GB 12GB 120Hz 5G 2026")).toBe("256gb 12gb 120hz 5g 2026");
  });

  test("9. Currency information remains intact (₹50,000, Rs 50,000, INR 50000, $500, USD 500)", () => {
    expect(normalizeQuery("₹50,000")).toBe("₹50,000");
    expect(normalizeQuery("Rs 50,000")).toBe("rs 50,000");
    expect(normalizeQuery("INR 50000")).toBe("inr 50000");
    expect(normalizeQuery("$500")).toBe("$500");
    expect(normalizeQuery("USD 500")).toBe("usd 500");
  });

  test("10. Decimal numbers remain intact (3.5mm, 6.7 inch)", () => {
    expect(normalizeQuery("3.5mm")).toBe("3.5mm");
    expect(normalizeQuery("6.7 inch")).toBe("6.7 inch");
    expect(normalizeQuery("phone with 3.5mm jack")).toBe("phone with 3.5mm jack");
  });

  test("11. Meaningful punctuation/symbols are not blindly removed (+, -, /, ., %, &, #)", () => {
    expect(normalizeQuery("iPhone 15/16")).toBe("iphone 15/16");
    expect(normalizeQuery("100%")).toBe("100%");
    expect(normalizeQuery("AT&T")).toBe("at&t");
    expect(normalizeQuery("#1 phone")).toBe("#1 phone");
  });

  test("12. Repeated conversational punctuation is normalized safely", () => {
    expect(normalizeQuery("  Best SAMSUNG phone under ₹50,000!!!  ")).toBe("best samsung phone under ₹50,000");
    expect(normalizeQuery("really???")).toBe("really");
    expect(normalizeQuery("great phone...")).toBe("great phone");
  });

  test("13. Tabs and newlines are normalized", () => {
    expect(normalizeQuery("best samsung\nphone\tunder 50000")).toBe("best samsung phone under 50000");
  });

  test("14. Original query remains unchanged in RecommendationRequest.originalQuery while normalizedQuery is set", () => {
    const raw = "  Best SAMSUNG phone under ₹50,000!!!  ";
    const request = extractUserIntent(raw);

    expect(request.originalQuery).toBe(raw);
    expect(request.normalizedQuery).toBe("best samsung phone under ₹50,000");
  });

  test("15. Normalized representation is deterministic", () => {
    const raw = "Best SAMSUNG phone under ₹50,000!!!";
    const res1 = normalizeQuery(raw);
    const res2 = normalizeQuery(raw);

    expect(res1).toBe(res2);
  });

  test("16. Empty/null/undefined input is handled safely", () => {
    expect(normalizeQuery("")).toBe("");
    expect(normalizeQuery("   ")).toBe("");
    expect(normalizeQuery(null)).toBe("");
    expect(normalizeQuery(undefined)).toBe("");
  });

  test("17. No requirements, preferences, or constraints are extracted at this stage", () => {
    const request = extractUserIntent("best samsung phone under ₹50,000");

    expect(request.explicitRequirements).toEqual([]);
    expect(request.userPreferences).toEqual([]);
    expect(request.hardConstraints).toEqual([
      { attribute: "price", operator: "less_than", value: 50000 }
    ]);
    expect(request.productContext).toEqual({ category: "smartphone", brand: "samsung" });
  });

  test("18. Existing extractUserIntent() behavior remains compatible with RecommendationRequest", () => {
    const request = extractUserIntent("samsung phone");

    expect(request).toHaveProperty("originalQuery");
    expect(request).toHaveProperty("normalizedQuery");
    expect(request).toHaveProperty("candidates");
    expect(request.candidates).toEqual([]);
  });
});
