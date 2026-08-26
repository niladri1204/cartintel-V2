import { describe, test, expect } from "vitest";
import { parseFootwearSize, convertToUkSize, areFootwearSizesCompatible } from "../footwearSize";
import { deriveColorFamily, extractFashionAttributes } from "../extractors/fashion";
import { inferCategoryAndType } from "../category";
import { inferDomain, ProductDomain, areDomainsCompatible } from "../domain";
import { compareProducts } from "../matching";
import { processProduct } from "../engine";
import type { ProductIntelligence } from "../types";

describe("Phase 4.4.1 — Footwear Intelligence + Fashion Foundation Suite", () => {
  // 1. Footwear classification
  test("1. Footwear category & domain classification", () => {
    const res = inferCategoryAndType("Puma Electron Street Shoes");
    expect(res.category).toBe("Fashion");
    expect(res.productType).toBe("Shoes");

    const dom = inferDomain("Fashion", "Puma Electron Street Shoes");
    expect(dom).toBe(ProductDomain.Fashion);
  });

  // 2. Footwear subtype classification
  test("2. Footwear subtype classification", () => {
    expect(inferCategoryAndType("Nike Pegasus Running Shoes").productType).toBe("Running Shoes");
    expect(inferCategoryAndType("Bata Oxford Leather Formal Shoes").productType).toBe("Formal Shoes");
    expect(inferCategoryAndType("Puma Leather Sandals & Floaters").productType).toBe("Sandals & Floaters");
    expect(inferCategoryAndType("Adidas Comfort Slides & Flip Flops").productType).toBe("Slides & Flip-Flops");
    expect(inferCategoryAndType("Nike Mercurial Football Cleats").productType).toBe("Sports Cleats");
  });

  // 3. UK/US/EU/CM size parsing
  test("3. UK/US/EU/CM size parsing", () => {
    const uk = parseFootwearSize("UK 9", "Men");
    expect(uk?.system).toBe("UK");
    expect(uk?.value).toBe(9);
    expect(uk?.canonicalUkSize).toBe(9);

    const us = parseFootwearSize("US 10", "Men");
    expect(us?.system).toBe("US");
    expect(us?.value).toBe(10);
    expect(us?.canonicalUkSize).toBe(9);

    const eu = parseFootwearSize("EU 43", "Men");
    expect(eu?.system).toBe("EU");
    expect(eu?.value).toBe(43);
    expect(eu?.canonicalUkSize).toBe(9);
  });

  // 4. Reliable size equivalence
  test("4. Reliable size equivalence between UK 9, US 10, EU 43", () => {
    const uk9 = parseFootwearSize("UK 9", "Men");
    const eu43 = parseFootwearSize("EU 43", "Men");
    const comp = areFootwearSizesCompatible(uk9, eu43);

    expect(comp.isMatch).toBe(true);
    expect(comp.isEquivalent).toBe(true);
  });

  // 5. Unknown size safety
  test("5. Missing/unknown size does not cause automatic conflict", () => {
    const uk9 = parseFootwearSize("UK 9", "Men");
    const comp = areFootwearSizesCompatible(uk9, null);

    expect(comp.isMatch).toBe(true);
    expect(comp.isEquivalent).toBe(false);
  });

  // 6. Gender extraction
  test("6. Gender extraction from product text", () => {
    expect(extractFashionAttributes(["puma", "nitro", "velocity", "men's"]).gender).toBe("Men");
    expect(extractFashionAttributes(["nike", "air", "max", "women's"]).gender).toBe("Women");
    expect(extractFashionAttributes(["adidas", "unisex", "sneakers"]).gender).toBe("Unisex");
  });

  // 7. Gender conflict
  test("7. Explicit gender conflict (Men vs Women) returns No Match", () => {
    const p1: ProductIntelligence = { ...processProduct({ title: "Puma Nitro Velocity Shoes", price: 4999, currency: "INR", image: null, url: "https://puma.com/p1", hostname: "puma.com" }), gender: "Men" };
    const p2: ProductIntelligence = { ...processProduct({ title: "Puma Nitro Velocity Shoes", price: 4999, currency: "INR", image: null, url: "https://puma.com/p2", hostname: "puma.com" }), gender: "Women" };

    const match = compareProducts(p1, p2);
    expect(match.isMatch).toBe(false);
    expect(match.decision).toBe("No Match");
  });

  // 8. Unisex handling
  test("8. Unisex gender is compatible with Men's or Women's shoes", () => {
    const unisexShoe = processProduct({ title: "Puma Unisex Sneakers UK 9", price: 3499, currency: "INR", image: null, url: "https://puma.com/p1", hostname: "puma.com" });
    const menShoe = processProduct({ title: "Puma Men's Sneakers UK 9", price: 3499, currency: "INR", image: null, url: "https://puma.com/p2", hostname: "puma.com" });

    const match = compareProducts(unisexShoe, menShoe);
    expect(match.mismatchedFields).not.toContain("gender");
  });

  // 9. Color-family normalization
  test("9. Color-family normalization to canonical families", () => {
    expect(deriveColorFamily("Core Black")).toBe("Black");
    expect(deriveColorFamily("Puma Black-Asphalt-Gum")).toBe("Black");
    expect(deriveColorFamily("Triple White")).toBe("White");
    expect(deriveColorFamily("Puma Navy Blue")).toBe("Blue");
  });

  // 10. Raw color preservation
  test("10. Raw color value preservation in extractFashionAttributes", () => {
    const attrs = extractFashionAttributes(["puma", "black", "sneakers"]);
    expect(attrs.color).toBe("black");
  });

  // 11. Material extraction
  test("11. Material extraction (leather upper, mesh, rubber sole)", () => {
    const attrs = extractFashionAttributes(["leather", "upper", "rubber", "sole"]);
    expect(attrs.material).toBe("leather upper");
  });

  // 12. Footwear variant comparison
  test("12. Footwear variant comparison with size and color", () => {
    const p1 = processProduct({ title: "Puma Electron Street Black UK 9", price: 3499, currency: "INR", image: null, url: "https://puma.com/p1", hostname: "puma.com" });
    const p2 = processProduct({ title: "Puma Electron Street Black UK 9", price: 3299, currency: "INR", image: null, url: "https://amazon.in/p1", hostname: "amazon.in" });

    const match = compareProducts(p1, p2);
    expect(match.isMatch).toBe(true);
  });

  // 13. Fashion product-type classification
  test("13. Fashion apparel product-type classification", () => {
    expect(inferCategoryAndType("H&M Cotton T-Shirt").productType).toBe("T-Shirt");
    expect(inferCategoryAndType("Levi's 501 Slim Fit Jeans").productType).toBe("Jeans");
    expect(inferCategoryAndType("Zara Bomber Jacket").productType).toBe("Jacket");
    expect(inferCategoryAndType("FabIndia Silk Saree").productType).toBe("Ethnic Wear");
  });

  // 14. Fashion attribute extraction
  test("14. Fashion attribute extraction (size, gender, material, variant)", () => {
    const attrs = extractFashionAttributes(["men's", "slim", "fit", "cotton", "t-shirt", "size", "xl"]);
    expect(attrs.gender).toBe("Men");
    expect(attrs.variant).toBe("slim");
    expect(attrs.material).toBe("cotton");
  });

  // 15. Fashion size handling
  test("15. Clothing size parsing (S, M, L, XL, XXL)", () => {
    expect(extractFashionAttributes(["size", "m"]).size).toBe("m");
    expect(extractFashionAttributes(["size", "xl"]).size).toBe("xl");
  });

  // 16. Discovery integration
  test("16. Footwear context propagates correctly into discovery model", () => {
    const p = processProduct({ title: "Bata Oxford Formal Shoes Black", price: 2499, currency: "INR", image: null, url: "https://bata.in/p1", hostname: "bata.in" });
    expect(p.brand).toBe("bata");
    expect(p.productType).toBe("Formal Shoes");
    expect(p.domain).toBe(ProductDomain.Fashion);
  });

  // 17. Brand preservation
  test("17. Brand equality is required; Puma vs Nike returns No Match", () => {
    const puma = processProduct({ title: "Puma Running Shoes", price: 3999, currency: "INR", image: null, url: "https://puma.com/p1", hostname: "puma.com" });
    const nike = processProduct({ title: "Nike Running Shoes", price: 3999, currency: "INR", image: null, url: "https://nike.com/p1", hostname: "nike.com" });

    const match = compareProducts(puma, nike);
    expect(match.isMatch).toBe(false);
    expect(match.decision).toBe("No Match");
  });

  // 18. Cross-domain protection
  test("18. Cross-domain rejection between Shoes and Smartphone", () => {
    const shoe = processProduct({ title: "Puma Electron Street Shoes", price: 3499, currency: "INR", image: null, url: "https://puma.com/p1", hostname: "puma.com" });
    const phone = processProduct({ title: "Samsung Galaxy S24 Ultra", price: 120000, currency: "INR", image: null, url: "https://amazon.in/p1", hostname: "amazon.in" });

    expect(areDomainsCompatible(shoe.domain, phone.domain)).toBe(false);
    expect(compareProducts(shoe, phone).isMatch).toBe(false);
  });

  // 19. Electronics regression
  test("19. Electronics identity and matching baseline remain unchanged", () => {
    const s24_1 = processProduct({ title: "Samsung Galaxy S24 (8GB RAM, 256GB Storage)", price: 79999, currency: "INR", image: null, url: "https://amazon.in/p1", hostname: "amazon.in" });
    const s24_2 = processProduct({ title: "Samsung Galaxy S24 (8GB RAM, 256GB Storage)", price: 74999, currency: "INR", image: null, url: "https://flipkart.com/p1", hostname: "flipkart.com" });

    const match = compareProducts(s24_1, s24_2);
    expect(match.isMatch).toBe(true);
    expect(match.decision).toBe("Exact Match");
  });

  // 20. Determinism
  test("20. Footwear size parsing is strictly deterministic", () => {
    const s1 = parseFootwearSize("UK 9", "Men");
    const s2 = parseFootwearSize("UK 9", "Men");
    expect(s1).toEqual(s2);
  });

  // 21. Immutability
  test("21. Footwear attribute extraction does not mutate input tokens", () => {
    const tokens = ["puma", "black", "shoes"];
    const copy = [...tokens];
    extractFashionAttributes(tokens);
    expect(tokens).toEqual(copy);
  });

  // 22. Missing-data safety
  test("22. Null and empty inputs are handled gracefully without throwing", () => {
    expect(parseFootwearSize(null)).toBeNull();
    expect(parseFootwearSize("")).toBeNull();
    expect(deriveColorFamily(null)).toBeNull();
    expect(areFootwearSizesCompatible(null, null).isMatch).toBe(true);
  });

  // 23. Footwear Style / Silhouette Extraction & Preference
  test("23. Footwear style extraction (Running, Formal, Basketball)", () => {
    expect(extractFashionAttributes(["puma", "running", "shoes"]).style).toBe("Running");
    expect(extractFashionAttributes(["bata", "oxford", "formal", "shoes"]).style).toBe("Formal");
    expect(extractFashionAttributes(["nike", "basketball", "high-top"]).style).toBe("Basketball");
  });

  // 24. Cross-Merchant Size Equivalence (Myntra UK 9 vs Puma US 10 vs Amazon EU 43)
  test("24. Cross-merchant size equivalence across Myntra (UK 9), Puma (US 10), Amazon (EU 43)", () => {
    const myntraSize = parseFootwearSize("UK 9", "Men");
    const pumaSize = parseFootwearSize("US 10", "Men");
    const amazonSize = parseFootwearSize("EU 43", "Men");

    expect(areFootwearSizesCompatible(myntraSize, pumaSize).isMatch).toBe(true);
    expect(areFootwearSizesCompatible(pumaSize, amazonSize).isMatch).toBe(true);
    expect(areFootwearSizesCompatible(myntraSize, amazonSize).isMatch).toBe(true);
  });
});
