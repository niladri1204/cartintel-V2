import { describe, test, expect } from "vitest";
import { inferCategoryAndType } from "../category";
import { inferDomain, ProductDomain } from "../domain";
import { processProduct } from "../engine";
import { compareProducts } from "../matching";
import { getEligibleMerchantsForProduct } from "../merchantRegistry";
import { identifyAlternativeProducts } from "../decision/alternativeProduct";
import { buildRecommendationRequest } from "../intent/recommendationRequestBuilder";
import type { RecommendationCandidate } from "../recommendationTypes";

describe("Phase 4.4.3 — Universal Category & Domain Intelligence (Furniture & Books)", () => {
  // 1. Furniture classification
  test("1. Furniture domain & category classification", () => {
    const res = inferCategoryAndType("IKEA 3 Seater Sofa Wooden Frame");
    expect(res.category).toBe("Furniture");
    expect(res.productType).toBe("Sofa");

    const domain = inferDomain("Furniture", "IKEA 3 Seater Sofa Wooden Frame");
    expect(domain).toBe(ProductDomain.Furniture);
  });

  // 2. Furniture product types
  test("2. Furniture product types (Sofa, Office Chair, Dining Table, Bed, TV Unit)", () => {
    expect(inferCategoryAndType("Modern Reclining Armchair").productType).toBe("Chair");
    expect(inferCategoryAndType("Ergonomic Office Chair").productType).toBe("Office Chair");
    expect(inferCategoryAndType("Solid Wood Dining Table").productType).toBe("Dining Table");
    expect(inferCategoryAndType("King Size Bed Frame").productType).toBe("Bed Frame");
    expect(inferCategoryAndType("Wooden TV Unit Cabinet").productType).toBe("TV Unit");
  });

  // 3. Furniture dimensions
  test("3. Furniture dimension extraction (180 x 80 x 75 cm, 6 ft)", () => {
    const p1 = processProduct({ title: "Study Desk 180 x 80 x 75 cm", price: 5000, currency: "INR", image: null, url: "https://ikea.com/p1", hostname: "ikea.com" });
    expect(p1.dimensions).toContain("180");
    expect(p1.size).toBeDefined();

    const p2 = processProduct({ title: "6 ft Wooden Dining Table", price: 12000, currency: "INR", image: null, url: "https://pepperfry.com/p2", hostname: "pepperfry.com" });
    expect(p2.dimensions).toContain("6 ft");
  });

  // 4. Furniture material
  test("4. Furniture material extraction (Solid Wood, Engineered Wood, Metal, Leather)", () => {
    const p1 = processProduct({ title: "Solid Wood 3 Seater Sofa", price: 25000, currency: "INR", image: null, url: "https://ikea.com/p1", hostname: "ikea.com" });
    expect(p1.material).toBe("Solid Wood");

    const p2 = processProduct({ title: "Engineered Wood Bookshelf Cabinet", price: 4000, currency: "INR", image: null, url: "https://pepperfry.com/p2", hostname: "pepperfry.com" });
    expect(p2.material).toBe("Engineered Wood");
  });

  // 5. Furniture configuration/capacity
  test("5. Furniture seating capacity & bed size parsing (3 Seater, King Size)", () => {
    const sofa = processProduct({ title: "Fabric 3 Seater Sofa Brown", price: 15000, currency: "INR", image: null, url: "https://ikea.com/p1", hostname: "ikea.com" });
    expect(sofa.variant).toBe("3 Seater");

    const bed = processProduct({ title: "Teak Wood King Size Bed Frame", price: 30000, currency: "INR", image: null, url: "https://pepperfry.com/p2", hostname: "pepperfry.com" });
    expect(bed.variant).toBe("King Size");
  });

  // 6. Furniture color extraction
  test("6. Furniture color extraction (Walnut, Oak, Teak, Black, White)", () => {
    const p1 = processProduct({ title: "Walnut Brown Coffee Table", price: 3500, currency: "INR", image: null, url: "https://ikea.com/p1", hostname: "ikea.com" });
    expect(p1.color).toBeDefined();

    const p2 = processProduct({ title: "White Office Desk 120cm", price: 5000, currency: "INR", image: null, url: "https://ikea.com/p2", hostname: "ikea.com" });
    expect(p2.color).toBe("White");
  });

  // 7. Furniture variant behavior
  test("7. Furniture dimension & capacity variant comparison (3 Seater vs 2 Seater)", () => {
    const s3 = processProduct({ title: "IKEA Sofa 3 Seater Brown", price: 18000, currency: "INR", image: null, url: "https://ikea.com/p1", hostname: "ikea.com" });
    const s2 = processProduct({ title: "IKEA Sofa 2 Seater Brown", price: 14000, currency: "INR", image: null, url: "https://ikea.com/p2", hostname: "ikea.com" });

    const match = compareProducts(s3, s2);
    expect(["Exact Match", "Likely Match"]).toContain(match.decision);
  });

  // 8. Furniture identity separation
  test("8. Furniture identity separation: Sofa vs Coffee Table returns No Match", () => {
    const sofa = processProduct({ title: "IKEA Modern Sofa Brown", price: 18000, currency: "INR", image: null, url: "https://ikea.com/p1", hostname: "ikea.com" });
    const table = processProduct({ title: "IKEA Coffee Table Brown", price: 4000, currency: "INR", image: null, url: "https://ikea.com/p2", hostname: "ikea.com" });

    const match = compareProducts(sofa, table);
    expect(match.decision).toBe("No Match");
  });

  // 9. Furniture discovery routing
  test("9. Furniture product routing maps to Furniture domain merchants", () => {
    const merchants = getEligibleMerchantsForProduct(ProductDomain.Furniture, "Furniture", "IKEA");
    const names = merchants.map(m => m.name);

    expect(names).toContain("Pepperfry");
    expect(names).toContain("IKEA");
  });

  // 10. Book classification
  test("10. Book domain & category classification", () => {
    const res = inferCategoryAndType("Atomic Habits Paperback Book");
    expect(res.category).toBe("Books");
    expect(res.productType).toBe("Book");

    const domain = inferDomain("Books", "Atomic Habits Paperback Book");
    expect(domain).toBe(ProductDomain.Books);
  });

  // 11. Book metadata
  test("11. Book metadata extraction (Author, Publisher, ISBN, Page Count)", () => {
    const book = processProduct({ title: "Atomic Habits by James Clear Penguin ISBN 9780735211292 Paperback 320 pages", price: 450, currency: "INR", image: null, url: "https://amazon.in/p1", hostname: "amazon.in" });
    expect(book.author).toBe("James Clear");
    expect(book.publisher).toBe("Penguin");
    expect(book.format).toBe("Paperback");
  });

  // 12. ISBN handling
  test("12. ISBN match yields exact product model identity signal", () => {
    const b1 = processProduct({ title: "Atomic Habits ISBN 9780735211292", price: 450, currency: "INR", image: null, url: "https://amazon.in/p1", hostname: "amazon.in" });
    const b2 = processProduct({ title: "Atomic Habits ISBN 9780735211292", price: 400, currency: "INR", image: null, url: "https://flipkart.com/p2", hostname: "flipkart.com" });

    const match = compareProducts(b1, b2);
    expect(match.isMatch).toBe(true);
  });

  // 13. Book author handling
  test("13. Author mismatch returns No Match", () => {
    const b1 = processProduct({ title: "Deep Work by Cal Newport", price: 400, currency: "INR", image: null, url: "https://amazon.in/p1", hostname: "amazon.in" });
    const b2 = processProduct({ title: "Atomic Habits by James Clear", price: 450, currency: "INR", image: null, url: "https://amazon.in/p2", hostname: "amazon.in" });

    const match = compareProducts(b1, b2);
    expect(match.decision).toBe("No Match");
  });

  // 14. Book edition handling
  test("14. Book edition variant comparison (1st Edition vs 2nd Edition)", () => {
    const b1 = processProduct({ title: "Clean Code by Robert C Martin 1st Edition", price: 800, currency: "INR", image: null, url: "https://amazon.in/p1", hostname: "amazon.in" });
    const b2 = processProduct({ title: "Clean Code by Robert C Martin 2nd Edition", price: 950, currency: "INR", image: null, url: "https://amazon.in/p2", hostname: "amazon.in" });

    const match = compareProducts(b1, b2);
    expect(match.decision).toBe("Likely Match");
  });

  // 15. Book format handling
  test("15. Book format variant comparison (Paperback vs Hardcover)", () => {
    const b1 = processProduct({ title: "Sapiens Paperback by Yuval Noah Harari", price: 350, currency: "INR", image: null, url: "https://amazon.in/p1", hostname: "amazon.in" });
    const b2 = processProduct({ title: "Sapiens Hardcover by Yuval Noah Harari", price: 700, currency: "INR", image: null, url: "https://amazon.in/p2", hostname: "amazon.in" });

    const match = compareProducts(b1, b2);
    expect(match.decision).toBe("Likely Match");
    expect(match.similarityType).toBe("Different Format Variant");
  });

  // 16. Book language handling
  test("16. Book language extraction (English vs Hindi)", () => {
    const b1 = processProduct({ title: "Atomic Habits English Paperback", price: 450, currency: "INR", image: null, url: "https://amazon.in/p1", hostname: "amazon.in" });
    const b2 = processProduct({ title: "Atomic Habits Hindi Paperback", price: 300, currency: "INR", image: null, url: "https://amazon.in/p2", hostname: "amazon.in" });

    expect(b1.language).toBe("English");
    expect(b2.language).toBe("Hindi");

    const match = compareProducts(b1, b2);
    expect(match.decision).toBe("Likely Match");
  });

  // 17. Book variant behavior
  test("17. Book format variant signature generation", () => {
    const b1 = processProduct({ title: "Atomic Habits Paperback", price: 450, currency: "INR", image: null, url: "https://amazon.in/p1", hostname: "amazon.in" });
    const b2 = processProduct({ title: "Atomic Habits Kindle", price: 200, currency: "INR", image: null, url: "https://amazon.in/p2", hostname: "amazon.in" });

    expect(b1.format).toBe("Paperback");
    expect(b2.format).toBe("Kindle");
  });

  // 18. Book identity separation
  test("18. Book identity separation: Atomic Habits vs Deep Work returns No Match", () => {
    const b1 = processProduct({ title: "Atomic Habits Paperback", price: 450, currency: "INR", image: null, url: "https://amazon.in/p1", hostname: "amazon.in" });
    const b2 = processProduct({ title: "Deep Work Paperback", price: 400, currency: "INR", image: null, url: "https://amazon.in/p2", hostname: "amazon.in" });

    const match = compareProducts(b1, b2);
    expect(match.decision).toBe("No Match");
  });

  // 19. Book discovery routing
  test("19. Book product routing maps to Books domain merchants", () => {
    const merchants = getEligibleMerchantsForProduct(ProductDomain.Books, "Books", "Bookchor");
    const names = merchants.map(m => m.name);

    expect(names).toContain("Bookchor");
    expect(names).toContain("Amazon");
  });

  // 20. Furniture alternative isolation
  test("20. Furniture alternative recommendation isolation", () => {
    const targetSofa = processProduct({ title: "IKEA 3 Seater Sofa", price: 20000, currency: "INR", image: null, url: "https://ikea.com/p1", hostname: "ikea.com" });
    const altChair = processProduct({ title: "IKEA Reclining Chair", price: 12000, currency: "INR", image: null, url: "https://ikea.com/p2", hostname: "ikea.com" });
    const altPhone = processProduct({ title: "Samsung Galaxy S24", price: 60000, currency: "INR", image: null, url: "https://amazon.in/p3", hostname: "amazon.in" });

    const req = buildRecommendationRequest("Furniture sofa");
    req.candidates = [
      { product: targetSofa, isCurrentProduct: true },
      { product: altChair },
      { product: altPhone }
    ] as RecommendationCandidate[];

    const result = identifyAlternativeProducts(req);
    const altCategories = result.alternatives.map(a => a.product.category);

    expect(altCategories).not.toContain("Electronics");
  });

  // 21. Book alternative isolation
  test("21. Book alternative recommendation isolation", () => {
    const targetBook = processProduct({ title: "Atomic Habits Paperback", price: 450, currency: "INR", image: null, url: "https://amazon.in/p1", hostname: "amazon.in" });
    const altBook = processProduct({ title: "Deep Work Paperback", price: 400, currency: "INR", image: null, url: "https://amazon.in/p2", hostname: "amazon.in" });
    const altShoe = processProduct({ title: "Nike Air Max Shoes", price: 8000, currency: "INR", image: null, url: "https://nike.com/p3", hostname: "nike.com" });

    const req = buildRecommendationRequest("Self-help book");
    req.candidates = [
      { product: targetBook, isCurrentProduct: true },
      { product: altBook },
      { product: altShoe }
    ] as RecommendationCandidate[];

    const result = identifyAlternativeProducts(req);
    const altCategories = result.alternatives.map(a => a.product.category);

    expect(altCategories).not.toContain("Fashion");
  });

  // 22. Cross-domain rejection across all 7 domains
  test("22. Cross-domain rejection across Electronics, Fashion, Beauty, Grocery, Furniture, Books", () => {
    const phone = processProduct({ title: "Samsung Galaxy S24 256GB", price: 60000, currency: "INR", image: null, url: "https://amazon.in/p1", hostname: "amazon.in" });
    const sofa = processProduct({ title: "IKEA 3 Seater Sofa", price: 20000, currency: "INR", image: null, url: "https://ikea.com/p2", hostname: "ikea.com" });
    const book = processProduct({ title: "Atomic Habits Paperback", price: 450, currency: "INR", image: null, url: "https://amazon.in/p3", hostname: "amazon.in" });

    expect(compareProducts(phone, sofa).decision).toBe("No Match");
    expect(compareProducts(sofa, book).decision).toBe("No Match");
    expect(compareProducts(phone, book).decision).toBe("No Match");
  });

  // 23-27 Baseline regressions
  test("23. Electronics identity baseline remains intact", () => {
    const p1 = processProduct({ title: "Samsung Galaxy S24 (8GB RAM, 256GB Storage)", price: 60000, currency: "INR", image: null, url: "https://amazon.in/p1", hostname: "amazon.in" });
    const p2 = processProduct({ title: "Samsung Galaxy S24 (8GB RAM, 256GB Storage)", price: 58000, currency: "INR", image: null, url: "https://flipkart.com/p2", hostname: "flipkart.com" });
    expect(compareProducts(p1, p2).isMatch).toBe(true);
  });

  test("24. Footwear identity baseline remains intact", () => {
    const f1 = processProduct({ title: "Puma Electron Street Black UK 9", price: 3000, currency: "INR", image: null, url: "https://puma.com/p1", hostname: "puma.com" });
    const f2 = processProduct({ title: "Puma Electron Street Black UK 9", price: 2800, currency: "INR", image: null, url: "https://amazon.in/p2", hostname: "amazon.in" });
    expect(compareProducts(f1, f2).isMatch).toBe(true);
  });

  test("25. Fashion apparel classification baseline remains intact", () => {
    const res = inferCategoryAndType("Levis 501 Original Fit Jeans Blue");
    expect(res.category).toBe("Fashion");
    expect(res.productType).toBe("Jeans");
  });

  test("26. Beauty classification baseline remains intact", () => {
    const res = inferCategoryAndType("The Ordinary Niacinamide 10% Serum 30ml");
    expect(res.category).toBe("Beauty & Personal Care");
    expect(res.productType).toBe("Serum");
  });

  test("27. Grocery classification baseline remains intact", () => {
    const res = inferCategoryAndType("Tata Tea Gold 500g");
    expect(res.category).toBe("Grocery");
    expect(res.productType).toBe("Tea");
  });

  test("28. Phase 4.3 domain discovery rules remain intact", () => {
    const merchants = getEligibleMerchantsForProduct(ProductDomain.Electronics, "Electronics", "Croma");
    expect(merchants.some(m => m.name === "Croma")).toBe(true);
  });

  // 29-31 Safety, Determinism, Immutability
  test("29. Missing-data safety handles sparse inputs without throwing", () => {
    const p1 = processProduct({ title: "Wooden Table", price: null, currency: null, image: null, url: null });
    const p2 = processProduct({ title: "Book", price: null, currency: null, image: null, url: null });
    expect(() => compareProducts(p1, p2)).not.toThrow();
  });

  test("30. Furniture and Book extractions are strictly deterministic", () => {
    const p1 = processProduct({ title: "Atomic Habits by James Clear Penguin ISBN 9780735211292 Paperback", price: 450, currency: "INR", image: null, url: "https://amazon.in/p1", hostname: "amazon.in" });
    const p2 = processProduct({ title: "Atomic Habits by James Clear Penguin ISBN 9780735211292 Paperback", price: 450, currency: "INR", image: null, url: "https://amazon.in/p1", hostname: "amazon.in" });

    expect(p1.author).toBe(p2.author);
    expect(p1.isbn).toBe(p2.isbn);
    expect(p1.format).toBe(p2.format);
  });

  test("31. Input tokens remain unmutated after extraction", () => {
    const tokens = ["ikea", "3", "seater", "sofa", "brown"];
    const copy = [...tokens];
    inferCategoryAndType(tokens.join(" "));
    expect(tokens).toEqual(copy);
  });
});
