import { describe, test, expect } from "vitest";
import { inferCategoryAndType } from "../category";
import { inferDomain, ProductDomain, areDomainsCompatible } from "../domain";
import { extractBeautyAttributes } from "../extractors/beauty";
import { extractGroceryAttributes } from "../extractors/grocery";
import { compareProducts } from "../matching";
import { processProduct } from "../engine";

describe("Phase 4.4.2 — Beauty + Grocery Intelligence Suite", () => {
  // 1. Beauty domain classification
  test("1. Beauty domain & category classification", () => {
    const res = inferCategoryAndType("The Ordinary Niacinamide 10% Serum 30ml");
    expect(res.category).toBe("Beauty & Personal Care");
    expect(res.productType).toBe("Serum");

    const dom = inferDomain("Beauty & Personal Care", "The Ordinary Niacinamide Serum");
    expect(dom).toBe(ProductDomain.Beauty);
  });

  // 2. Beauty product types
  test("2. Beauty product type classification (Cleanser, Sunscreen, Foundation, Fragrance)", () => {
    expect(inferCategoryAndType("CeraVe Foaming Cleanser").productType).toBe("Cleanser");
    expect(inferCategoryAndType("Neutrogena Ultra Sheer Sunscreen SPF 50").productType).toBe("Sunscreen");
    expect(inferCategoryAndType("Maybelline Fit Me Liquid Foundation").productType).toBe("Foundation");
    expect(inferCategoryAndType("Dior Sauvage Eau De Parfum Perfume").productType).toBe("Fragrance");
  });

  // 3. Beauty attributes
  test("3. Beauty attribute extraction (volume, spf, ingredient, formulation, shade, skinType)", () => {
    const attrs = extractBeautyAttributes(["the", "ordinary", "niacinamide", "10%", "serum", "50ml", "spf", "50", "oily", "skin"]);
    expect(attrs.volume).toBe("50ml");
    expect(attrs.spf).toBe("SPF 50");
    expect(attrs.ingredient).toBe("Niacinamide");
    expect(attrs.formulation).toBe("Serum");
    expect(attrs.skinType).toBe("Oily");
  });

  // 4. Beauty volume/weight parsing
  test("4. Beauty volume & weight parsing (50ml, 100ml, 50g)", () => {
    expect(extractBeautyAttributes(["50ml"]).volume).toBe("50ml");
    expect(extractBeautyAttributes(["100ml"]).volume).toBe("100ml");
    expect(extractBeautyAttributes(["50g"]).weight).toBe("50g");
  });

  // 5. Beauty SPF extraction
  test("5. Beauty SPF extraction (SPF 50, SPF 30)", () => {
    expect(extractBeautyAttributes(["spf50"]).spf).toBe("SPF 50");
    expect(extractBeautyAttributes(["spf", "30"]).spf).toBe("SPF 30");
  });

  // 6. Beauty ingredient extraction
  test("6. Beauty active ingredient extraction (Niacinamide, Salicylic Acid, Retinol)", () => {
    expect(extractBeautyAttributes(["salicylic", "acid", "cleanser"]).ingredient).toBe("Salicylic Acid");
    expect(extractBeautyAttributes(["retinol", "0.5%", "serum"]).ingredient).toBe("Retinol");
  });

  // 7. Beauty formulation
  test("7. Beauty formulation extraction (Serum, Gel, Cream)", () => {
    expect(extractBeautyAttributes(["hydrating", "gel", "moisturizer"]).formulation).toBe("Gel");
    expect(extractBeautyAttributes(["night", "cream"]).formulation).toBe("Cream");
  });

  // 8. Beauty shade
  test("8. Beauty foundation shade extraction (Shade 120, Ivory)", () => {
    expect(extractBeautyAttributes(["foundation", "shade", "120"]).shade).toBe("Shade 120");
    expect(extractBeautyAttributes(["foundation", "ivory"]).shade).toBe("Ivory");
  });

  // 9. Beauty variant comparison
  test("9. Beauty volume variant comparison (50ml vs 100ml)", () => {
    const p1 = processProduct({ title: "The Ordinary Niacinamide Serum 50ml", price: 600, currency: "INR", image: null, url: "https://nykaa.com/p1", hostname: "nykaa.com" });
    const p2 = processProduct({ title: "The Ordinary Niacinamide Serum 100ml", price: 1000, currency: "INR", image: null, url: "https://nykaa.com/p2", hostname: "nykaa.com" });

    const match = compareProducts(p1, p2);
    expect(match.decision).toBe("Likely Match");
    expect(match.similarityType).toBe("Different Quantity Variant");
  });

  // 10. Beauty identity separation
  test("10. Beauty identity separation: Niacinamide Serum vs Moisturizer returns No Match", () => {
    const serum = processProduct({ title: "The Ordinary Niacinamide 10% Serum 30ml", price: 600, currency: "INR", image: null, url: "https://nykaa.com/p1", hostname: "nykaa.com" });
    const moisturizer = processProduct({ title: "The Ordinary Natural Moisturizing Factors Cream 30ml", price: 650, currency: "INR", image: null, url: "https://nykaa.com/p2", hostname: "nykaa.com" });

    const match = compareProducts(serum, moisturizer);
    expect(match.isMatch).toBe(false);
    expect(match.decision).toBe("No Match");
  });

  // 11. Beauty discovery routing
  test("11. Beauty product routing maps to Beauty domain", () => {
    const p = processProduct({ title: "Nykaa SkinRx 10% Niacinamide Serum", price: 799, currency: "INR", image: null, url: "https://nykaa.com/p1", hostname: "nykaa.com" });
    expect(p.domain).toBe(ProductDomain.Beauty);
    expect(p.productType).toBe("Serum");
  });

  // 12. Grocery domain classification
  test("12. Grocery domain & category classification", () => {
    const res = inferCategoryAndType("Nescafe Classic Instant Coffee 200g");
    expect(res.category).toBe("Grocery");
    expect(res.productType).toBe("Coffee");

    const dom = inferDomain("Grocery", "Nescafe Classic Coffee");
    expect(dom).toBe(ProductDomain.Grocery);
  });

  // 13. Grocery product types
  test("13. Grocery product type classification (Coffee, Tea, Beverages, Chips, Chocolate)", () => {
    expect(inferCategoryAndType("Tata Tea Gold 500g").productType).toBe("Tea");
    expect(inferCategoryAndType("Coca-Cola Original 750ml").productType).toBe("Beverages");
    expect(inferCategoryAndType("Lay's Classic Potato Chips 50g").productType).toBe("Snacks & Chips");
    expect(inferCategoryAndType("Cadbury Dairy Milk Chocolate 100g").productType).toBe("Chocolate");
  });

  // 14. Grocery weight/volume
  test("14. Grocery weight & volume parsing (500g, 1kg, 2L, 500ml)", () => {
    expect(extractGroceryAttributes(["500g"]).weight).toBe("500g");
    expect(extractGroceryAttributes(["1kg"]).weight).toBe("1kg");
    expect(extractGroceryAttributes(["2l"]).volume).toBe("2l");
    expect(extractGroceryAttributes(["500ml"]).volume).toBe("500ml");
  });

  // 15. Grocery pack count
  test("15. Grocery pack count parsing (Pack of 6, 6 x 500ml)", () => {
    expect(extractGroceryAttributes(["pack", "of", "6"]).packCount).toBe("pack of 6");
    expect(extractGroceryAttributes(["x6"]).packCount).toBe("pack of 6");
  });

  // 16. Grocery flavor differentiation
  test("16. Grocery flavor differentiation (Lay's Classic vs Lay's Magic Masala returns No Match)", () => {
    const classic = processProduct({ title: "Lay's Potato Chips Classic 50g", price: 20, currency: "INR", image: null, url: "https://blinkit.com/p1", hostname: "blinkit.com" });
    const masala = processProduct({ title: "Lay's Potato Chips Magic Masala 50g", price: 20, currency: "INR", image: null, url: "https://blinkit.com/p2", hostname: "blinkit.com" });

    const match = compareProducts(classic, masala);
    expect(match.isMatch).toBe(false);
    expect(match.decision).toBe("No Match");
  });

  // 17. Grocery formulation differentiation
  test("17. Grocery formulation differentiation (Coca-Cola Original vs Zero Sugar returns formulation mismatch)", () => {
    const original = processProduct({ title: "Coca-Cola Original Soft Drink 750ml", price: 40, currency: "INR", image: null, url: "https://blinkit.com/p1", hostname: "blinkit.com" });
    const zero = processProduct({ title: "Coca-Cola Zero Sugar Soft Drink 750ml", price: 40, currency: "INR", image: null, url: "https://blinkit.com/p2", hostname: "blinkit.com" });

    const match = compareProducts(original, zero);
    expect(match.mismatchedFields.some(f => f === "formulation" || f === "variant")).toBe(true);
  });

  // 18. Grocery variant comparison
  test("18. Grocery quantity variant comparison (500g vs 1kg)", () => {
    const g500 = processProduct({ title: "Tata Tea Gold 500g", price: 300, currency: "INR", image: null, url: "https://blinkit.com/p1", hostname: "blinkit.com" });
    const kg1 = processProduct({ title: "Tata Tea Gold 1kg", price: 550, currency: "INR", image: null, url: "https://blinkit.com/p2", hostname: "blinkit.com" });

    const match = compareProducts(g500, kg1);
    expect(match.decision).toBe("Likely Match");
    expect(match.similarityType).toBe("Different Quantity Variant");
  });

  // 19. Grocery identity separation
  test("19. Grocery identity separation: Nescafe Coffee vs Tata Tea returns No Match", () => {
    const coffee = processProduct({ title: "Nescafe Classic Instant Coffee 100g", price: 300, currency: "INR", image: null, url: "https://blinkit.com/p1", hostname: "blinkit.com" });
    const tea = processProduct({ title: "Tata Tea Gold 100g", price: 150, currency: "INR", image: null, url: "https://blinkit.com/p2", hostname: "blinkit.com" });

    const match = compareProducts(coffee, tea);
    expect(match.isMatch).toBe(false);
    expect(match.decision).toBe("No Match");
  });

  // 20. Grocery discovery routing
  test("20. Grocery product routing maps to Grocery domain", () => {
    const p = processProduct({ title: "Nescafe Classic Instant Coffee 200g", price: 550, currency: "INR", image: null, url: "https://blinkit.com/p1", hostname: "blinkit.com" });
    expect(p.domain).toBe(ProductDomain.Grocery);
    expect(p.productType).toBe("Coffee");
  });

  // 21. Cross-domain filtering
  test("21. Cross-domain rejection between Coffee and Niacinamide Serum", () => {
    const coffee = processProduct({ title: "Nescafe Classic Instant Coffee 100g", price: 300, currency: "INR", image: null, url: "https://blinkit.com/p1", hostname: "blinkit.com" });
    const serum = processProduct({ title: "The Ordinary Niacinamide Serum 30ml", price: 600, currency: "INR", image: null, url: "https://nykaa.com/p1", hostname: "nykaa.com" });

    expect(areDomainsCompatible(coffee.domain, serum.domain)).toBe(false);
    expect(compareProducts(coffee, serum).isMatch).toBe(false);
  });

  // 22. Electronics regression
  test("22. Baseline Electronics identity and matching remain unchanged", () => {
    const s24_1 = processProduct({ title: "Samsung Galaxy S24 (8GB RAM, 256GB Storage)", price: 79999, currency: "INR", image: null, url: "https://amazon.in/p1", hostname: "amazon.in" });
    const s24_2 = processProduct({ title: "Samsung Galaxy S24 (8GB RAM, 256GB Storage)", price: 74999, currency: "INR", image: null, url: "https://flipkart.com/p1", hostname: "flipkart.com" });

    const match = compareProducts(s24_1, s24_2);
    expect(match.isMatch).toBe(true);
    expect(match.decision).toBe("Exact Match");
  });

  // 23. Footwear regression
  test("23. Footwear identity and matching baseline remain unchanged", () => {
    const shoe1 = processProduct({ title: "Puma Electron Street Black UK 9", price: 3499, currency: "INR", image: null, url: "https://puma.com/p1", hostname: "puma.com" });
    const shoe2 = processProduct({ title: "Puma Electron Street Black UK 9", price: 3299, currency: "INR", image: null, url: "https://amazon.in/p1", hostname: "amazon.in" });

    const match = compareProducts(shoe1, shoe2);
    expect(match.isMatch).toBe(true);
  });

  // 24. Fashion regression
  test("24. Fashion apparel classification baseline remains unchanged", () => {
    expect(inferCategoryAndType("H&M Cotton T-Shirt").productType).toBe("T-Shirt");
    expect(inferCategoryAndType("Levi's 501 Slim Fit Jeans").productType).toBe("Jeans");
  });

  // 25. Phase 4.3 domain discovery regression
  test("25. Phase 4.3 domain discovery compatibility rules remain intact", () => {
    expect(areDomainsCompatible(ProductDomain.Beauty, ProductDomain.Electronics)).toBe(false);
    expect(areDomainsCompatible(ProductDomain.Grocery, ProductDomain.Fashion)).toBe(false);
    expect(areDomainsCompatible(ProductDomain.General, ProductDomain.Beauty)).toBe(true);
  });

  // 26. Missing-data safety
  test("26. Null and empty inputs are handled gracefully without throwing", () => {
    expect(extractBeautyAttributes([])).toBeDefined();
    expect(extractGroceryAttributes([])).toBeDefined();
  });

  // 27. Determinism
  test("27. Beauty and Grocery attribute extractions are strictly deterministic", () => {
    const a1 = extractBeautyAttributes(["niacinamide", "50ml"]);
    const a2 = extractBeautyAttributes(["niacinamide", "50ml"]);
    expect(a1).toEqual(a2);
  });

  // 28. Immutability
  test("28. Token extraction does not mutate input tokens", () => {
    const tokens = ["nescafe", "coffee", "200g"];
    const copy = [...tokens];
    extractGroceryAttributes(tokens);
    expect(tokens).toEqual(copy);
  });

  // 29. Pack of 1 safety
  test("29. '1 pack' or 'pack of 1' is not treated as a multi-pack count", () => {
    expect(extractGroceryAttributes(["pack", "of", "1"]).packCount).toBeNull();
    expect(extractGroceryAttributes(["1", "pack"]).packCount).toBeNull();
  });
});
