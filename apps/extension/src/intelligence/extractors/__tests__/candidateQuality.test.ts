import { describe, test, expect } from "vitest";
import { classifyCandidateQuality } from "../../candidateQuality";
import type { ProductIntelligence } from "../../types";

describe("Candidate Quality and Offer Consolidation Tests", () => {
  // Test 1: Normal OnePlus 15R product -> product -> eligible
  test("1. Normal OnePlus 15R product", () => {
    const product: ProductIntelligence = {
      originalTitle: "OnePlus 15R 12GB 256GB",
      originalPrice: 39999,
      originalCurrency: "INR",
      brand: "OnePlus",
      model: "15R",
      category: "Smartphones",
      productType: "Smartphone",
      fingerprint: "oneplus|15r|256gb|12gb"
    };

    const res = classifyCandidateQuality(product);
    expect(res.status).toBe("product");
    expect(res.isEligibleProduct).toBe(true);
  });

  // Test 2: OnePlus 15R Case -> accessory -> not eligible
  test("2. OnePlus 15R Case", () => {
    const product: ProductIntelligence = {
      originalTitle: "OnePlus 15R Case",
      originalPrice: 499,
      originalCurrency: "INR",
      brand: "OnePlus",
      model: "15R",
      category: "Accessories",
      productType: "Case",
      fingerprint: "oneplus|15r|case"
    };

    const res = classifyCandidateQuality(product);
    expect(res.status).toBe("accessory");
    expect(res.isEligibleProduct).toBe(false);
  });

  // Test 3: Battery for OnePlus 15R -> replacement_part -> not eligible
  test("3. Battery for OnePlus 15R", () => {
    const product: ProductIntelligence = {
      originalTitle: "Battery for OnePlus 15R",
      originalPrice: 1999,
      originalCurrency: "INR",
      brand: "OnePlus",
      model: "15R",
      category: "Replacement Parts",
      productType: "Battery",
      fingerprint: "oneplus|15r|battery"
    };

    const res = classifyCandidateQuality(product);
    expect(res.status).toBe("replacement_part");
    expect(res.isEligibleProduct).toBe(false);
  });

  // Test 4: OnePlus 15R LCD Screen Replacement -> replacement_part -> not eligible
  test("4. OnePlus 15R LCD Screen Replacement", () => {
    const product: ProductIntelligence = {
      originalTitle: "OnePlus 15R LCD Screen Replacement",
      originalPrice: 4999,
      originalCurrency: "INR",
      brand: "OnePlus",
      model: "15R",
      category: "Replacement Parts",
      productType: "LCD Screen",
      fingerprint: "oneplus|15r|lcd"
    };

    const res = classifyCandidateQuality(product);
    expect(res.status).toBe("replacement_part");
    expect(res.isEligibleProduct).toBe(false);
  });

  // Test 5: OnePlus 15R 12GB 256GB with Case Bundle -> bundle -> eligible
  test("5. OnePlus 15R 12GB 256GB with Case Bundle", () => {
    const product: ProductIntelligence = {
      originalTitle: "OnePlus 15R 12GB 256GB with Case Bundle",
      originalPrice: 40999,
      originalCurrency: "INR",
      brand: "OnePlus",
      model: "15R",
      category: "Smartphones",
      productType: "Smartphone Bundle",
      fingerprint: "oneplus|15r|256gb|12gb|bundle"
    };

    const res = classifyCandidateQuality(product);
    expect(res.status).toBe("bundle");
    expect(res.isEligibleProduct).toBe(true);
  });

  // Test 6: Determinism + immutability -> run classification twice -> identical result -> original ProductIntelligence object unchanged
  test("6. Determinism + immutability", () => {
    const product: ProductIntelligence = {
      originalTitle: "OnePlus 15R 12GB 256GB",
      originalPrice: 39999,
      originalCurrency: "INR",
      brand: "OnePlus",
      model: "15R",
      category: "Smartphones",
      productType: "Smartphone",
      fingerprint: "oneplus|15r|256gb|12gb"
    };

    const productFrozen = JSON.parse(JSON.stringify(product));

    const res1 = classifyCandidateQuality(product);
    const res2 = classifyCandidateQuality(product);

    expect(res1).toEqual(res2);
    expect(product).toEqual(productFrozen);
  });
});
