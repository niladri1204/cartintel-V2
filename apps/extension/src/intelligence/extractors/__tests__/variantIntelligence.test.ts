import { describe, test, expect } from "vitest";
import { generateVariantSignature } from "../../variant";
import { compareProducts } from "../../matching";
import { evaluateVariantState } from "../../ranking";
import { processProduct } from "../../engine";
import type { ProductIntelligence } from "../../types";

describe("Electronics Variant Intelligence - Phase 2.2", () => {
  const getProduct = (title: string, overrides: Partial<ProductIntelligence> = {}): ProductIntelligence => {
    const base = processProduct({
      title,
      price: 49999,
      currency: "INR",
      image: null,
      url: "https://www.amazon.in/dp/123",
      hostname: "amazon.in"
    });
    return { ...base, ...overrides };
  };

  test("1. Smartphone storage variants (128GB vs 256GB)", () => {
    const p1 = getProduct("Samsung Galaxy S24 (8GB RAM, 128GB Storage)");
    const p2 = getProduct("Samsung Galaxy S24 (8GB RAM, 256GB Storage)");

    expect(generateVariantSignature(p1)).toBe("8GB|128GB");
    expect(generateVariantSignature(p2)).toBe("8GB|256GB");
    expect(evaluateVariantState(p1, p2)).toBe("explicitly_conflicting");

    const match = compareProducts(p1, p2);
    expect(match.isMatch).toBe(false);
    expect(match.similarityType).toBe("Different Storage Variant");
  });

  test("2. Smartphone RAM variants (8GB vs 12GB)", () => {
    const p1 = getProduct("Samsung Galaxy S24 (8GB RAM, 256GB Storage)");
    const p2 = getProduct("Samsung Galaxy S24 (12GB RAM, 256GB Storage)");

    expect(generateVariantSignature(p1)).toBe("8GB|256GB");
    expect(generateVariantSignature(p2)).toBe("12GB|256GB");
    expect(evaluateVariantState(p1, p2)).toBe("explicitly_conflicting");

    const match = compareProducts(p1, p2);
    expect(match.isMatch).toBe(false);
    expect(match.similarityType).toBe("Different RAM Variant");
  });

  test("3. Laptop RAM/storage variants", () => {
    const p1 = getProduct("Dell XPS 15 | 16GB RAM | 512GB SSD");
    const p2 = getProduct("Dell XPS 15 | 32GB RAM | 1TB SSD");

    expect(generateVariantSignature(p1)).toBe("16GB|512GB");
    expect(generateVariantSignature(p2)).toBe("32GB|1TB");
    expect(evaluateVariantState(p1, p2)).toBe("explicitly_conflicting");
  });

  test("4. Laptop GPU variants (RTX 4060 vs RTX 4070)", () => {
    const p1 = getProduct("Lenovo Legion 5 | RTX 4060 | Core i7");
    const p2 = getProduct("Lenovo Legion 5 | RTX 4070 | Core i7");

    expect(generateVariantSignature(p1)).toContain("RTX4060");
    expect(generateVariantSignature(p2)).toContain("RTX4070");
    expect(evaluateVariantState(p1, p2)).toBe("explicitly_conflicting");

    const match = compareProducts(p1, p2);
    expect(match.isMatch).toBe(false);
  });

  test("5. Monitor refresh-rate variants (144Hz vs 240Hz)", () => {
    const p1 = getProduct("LG 27 inch Monitor 144Hz");
    const p2 = getProduct("LG 27 inch Monitor 240Hz");

    expect(generateVariantSignature(p1)).toContain("144Hz");
    expect(generateVariantSignature(p2)).toContain("240Hz");
    expect(evaluateVariantState(p1, p2)).toBe("explicitly_conflicting");
  });

  test("6. Monitor panel variants (OLED vs IPS)", () => {
    const p1 = getProduct("LG 27 inch OLED Monitor");
    const p2 = getProduct("LG 27 inch IPS Monitor");

    expect(generateVariantSignature(p1)).toContain("OLED");
    expect(generateVariantSignature(p2)).toContain("IPS");
    expect(evaluateVariantState(p1, p2)).toBe("explicitly_conflicting");
  });

  test("7. Wi-Fi vs Cellular variants", () => {
    const p1 = getProduct("Apple iPad Air Wi-Fi Only");
    const p2 = getProduct("Apple iPad Air Wi-Fi + Cellular");

    expect(generateVariantSignature(p1)).toContain("Wi-FiOnly");
    expect(generateVariantSignature(p2)).toContain("Wi-Fi+Cellular");
    expect(evaluateVariantState(p1, p2)).toBe("explicitly_conflicting");
  });

  test("8. India vs Global versions", () => {
    const p1 = getProduct("OnePlus 12 Indian Variant");
    const p2 = getProduct("OnePlus 12 Global Version");

    expect(generateVariantSignature(p1)).toContain("IndianVariant");
    expect(generateVariantSignature(p2)).toContain("GlobalVersion");
    expect(evaluateVariantState(p1, p2)).toBe("explicitly_conflicting");
  });

  test("9. New vs refurbished/used", () => {
    const p1 = getProduct("Apple iPhone 15");
    const p2 = getProduct("Refurbished Apple iPhone 15");

    expect(generateVariantSignature(p1)).not.toContain("Used");
    expect(generateVariantSignature(p2)).toContain("Used");
    expect(evaluateVariantState(p1, p2)).toBe("explicitly_conflicting");
  });

  test("10. Bundle vs standalone", () => {
    const p1 = getProduct("Samsung Galaxy S24");
    const p2 = getProduct("Samsung Galaxy S24 Pack with Case and Charger");

    expect(generateVariantSignature(p1)).not.toContain("Bundle");
    expect(generateVariantSignature(p2)).toContain("Bundle");
    expect(evaluateVariantState(p1, p2)).toBe("explicitly_conflicting");
  });

  test("11. Same variant across multiple merchants", () => {
    const p1 = getProduct("Samsung Galaxy S24 8GB 256GB");
    p1.metadata = { marketplace: "Amazon", hostname: "amazon.in", detectedAt: Date.now() };

    const p2 = getProduct("Samsung Galaxy S24 8GB 256GB");
    p2.metadata = { marketplace: "Flipkart", hostname: "flipkart.com", detectedAt: Date.now() };

    // Same identity + compatible variant
    expect(generateVariantSignature(p1)).toBe(generateVariantSignature(p2));
    expect(evaluateVariantState(p1, p2)).toBe("explicitly_matching");

    const match = compareProducts(p1, p2);
    expect(match.isMatch).toBe(true);
  });

  test("12. Different variants of the same model", () => {
    const p1 = getProduct("Samsung Galaxy S24 (8GB, 256GB)");
    const p2 = getProduct("Samsung Galaxy S24 (12GB, 512GB)");

    expect(evaluateVariantState(p1, p2)).toBe("explicitly_conflicting");
    const match = compareProducts(p1, p2);
    expect(match.isMatch).toBe(false);
  });

  test("13. Missing specification safety", () => {
    const p1 = getProduct("Samsung Galaxy S24 (8GB RAM, 256GB Storage)");
    const p2 = getProduct("Samsung Galaxy S24 (256GB Storage)"); // RAM missing

    expect(evaluateVariantState(p1, p2)).toBe("missing_unknown");
    // Missing specs do NOT cause variant mismatch in product comparison (it's similar product)
    const match = compareProducts(p1, p2);
    expect(match.isMatch).toBe(true);
    expect(match.similarityType).toBe("Similar Product");
  });

  test("14. Conflicting specification detection", () => {
    const p1 = getProduct("Samsung Galaxy S24 | Snapdragon 8 Gen 3");
    const p2 = getProduct("Samsung Galaxy S24 | Exynos 2400");

    expect(evaluateVariantState(p1, p2)).toBe("explicitly_conflicting");
    const match = compareProducts(p1, p2);
    expect(match.isMatch).toBe(false);
  });

  test("15. Normalized-equivalent specifications producing the same signature", () => {
    const p1 = getProduct("Samsung Galaxy S24 (8 GB RAM, 256 GB Storage)");
    const p2 = getProduct("Samsung Galaxy S24 (8GB RAM, 256GB Storage)");

    expect(generateVariantSignature(p1)).toBe("8GB|256GB");
    expect(generateVariantSignature(p2)).toBe("8GB|256GB");
    expect(generateVariantSignature(p1)).toBe(generateVariantSignature(p2));
  });

  test("16. Deterministic repeated execution", () => {
    const p1 = getProduct("Samsung Galaxy S24 8GB 256GB");
    const p2 = getProduct("Samsung Galaxy S24 12GB 512GB");

    expect(evaluateVariantState(p1, p2)).toBe("explicitly_conflicting");
    expect(evaluateVariantState(p1, p2)).toBe("explicitly_conflicting");
  });

  test("17. Input immutability", () => {
    const p1 = getProduct("Samsung Galaxy S24 8GB 256GB");
    const copy = { ...p1 };

    generateVariantSignature(p1);
    expect(p1).toEqual(copy);
  });

  test("18. Realistic smartphone scenario", () => {
    const p1 = getProduct("OnePlus 12 5G (Flowy Emerald, 16GB RAM, 512GB Storage) | Snapdragon 8 Gen 3");
    const p2 = getProduct("OnePlus 12 5G (Silky Black, 12GB RAM, 256GB Storage) | Snapdragon 8 Gen 3");

    expect(evaluateVariantState(p1, p2)).toBe("explicitly_conflicting");
    const match = compareProducts(p1, p2);
    expect(match.isMatch).toBe(false);
  });

  test("19. Realistic laptop scenario", () => {
    const p1 = getProduct("Apple 2023 MacBook Pro 16.2 inch Liquid Retina Display | Apple M3 Max | 40-core GPU | 36GB RAM | 1TB SSD");
    const p2 = getProduct("Apple 2023 MacBook Pro 16.2 inch Liquid Retina Display | Apple M3 Pro | 18-core GPU | 18GB RAM | 512GB SSD");

    expect(evaluateVariantState(p1, p2)).toBe("explicitly_conflicting");
    const match = compareProducts(p1, p2);
    expect(match.isMatch).toBe(false);
  });

  test("20. Realistic monitor scenario", () => {
    const p1 = getProduct("LG UltraGear 27-inch 4K UHD 144Hz IPS Gaming Monitor");
    const p2 = getProduct("LG UltraGear 27-inch QHD 240Hz OLED Gaming Monitor");

    expect(evaluateVariantState(p1, p2)).toBe("explicitly_conflicting");
    const match = compareProducts(p1, p2);
    expect(match.isMatch).toBe(false);
  });

  test("21. Regression - Mismatched brands, models, accessories, or bundles must return No Match", () => {
    // Brand mismatch
    const p1 = getProduct("Samsung Galaxy S24");
    const p2 = getProduct("Apple iPhone 15");
    const match1 = compareProducts(p1, p2);
    expect(match1.decision).toBe("No Match");
    expect(match1.isMatch).toBe(false);

    // Accessory mismatch (phone vs phone case)
    const p3 = getProduct("Samsung Galaxy S24 Case");
    const match2 = compareProducts(p1, p3);
    expect(match2.decision).toBe("No Match");
    expect(match2.isMatch).toBe(false);

    // Bundle mismatch
    const p4 = getProduct("Samsung Galaxy S24 Combo Pack");
    const match3 = compareProducts(p1, p4);
    expect(match3.decision).toBe("No Match");
    expect(match3.isMatch).toBe(false);
  });
});
