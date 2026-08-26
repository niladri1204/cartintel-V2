import { describe, test, expect } from "vitest";
import { inferCategoryAndType, determineCategory } from "../category";
import { inferDomain, ProductDomain } from "../domain";
import { processProduct } from "../engine";
import { compareProducts } from "../matching";
import {
  ELECTRONICS_KEYWORDS,
  FASHION_KEYWORDS,
  BEAUTY_KEYWORDS,
  GROCERY_KEYWORDS,
  FURNITURE_KEYWORDS,
  BOOKS_KEYWORDS
} from "../constants";

describe("Phase 4.5.1 — Universal Taxonomy Consistency Audit & Hardening", () => {

  // 1. Validate complete hierarchy mapping across all seven domains
  test("1. Complete hierarchy validation across all 7 domains", () => {
    const samples = [
      { title: "Apple iPhone 16 Pro 256GB", cat: "Electronics", dom: ProductDomain.Electronics, type: "Smartphone" },
      { title: "Nike Air Jordan 1 High Sneakers", cat: "Fashion", dom: ProductDomain.Fashion, type: "Sneakers" },
      { title: "The Ordinary Niacinamide 10% Serum 30ml", cat: "Beauty & Personal Care", dom: ProductDomain.Beauty, type: "Serum" },
      { title: "Tata Tea Gold 500g", cat: "Grocery", dom: ProductDomain.Grocery, type: "Tea" },
      { title: "IKEA 3 Seater Fabric Sofa Brown", cat: "Furniture", dom: ProductDomain.Furniture, type: "Sofa" },
      { title: "Atomic Habits Paperback Book by James Clear", cat: "Books", dom: ProductDomain.Books, type: "Book" },
      { title: "XYZ Unspecified Object Item 123", cat: "Uncategorized", dom: ProductDomain.General, type: null },
    ];

    for (const s of samples) {
      const res = inferCategoryAndType(s.title);
      expect(res.category).toBe(s.cat);
      if (s.type) {
        expect(res.productType).toBe(s.type);
      }
      const dom = inferDomain(res.category, s.title);
      expect(dom).toBe(s.dom);
    }
  });

  // 2. Precedence rule validations
  test("2. Product-type precedence: Hair Serum resolves to Hair Treatment, not generic Serum", () => {
    const res = inferCategoryAndType("L'Oreal Hair Serum 100ml");
    expect(res.category).toBe("Beauty & Personal Care");
    expect(res.productType).toBe("Hair Treatment");
  });

  test("3. Product-type precedence: Wooden TV Unit Cabinet resolves to TV Unit, not Television or Cabinet", () => {
    const res = inferCategoryAndType("Wooden TV Unit Cabinet");
    expect(res.category).toBe("Furniture");
    expect(res.productType).toBe("TV Unit");
  });

  test("4. Product-type precedence: Running Shoes resolves to Running Shoes, not generic Shoes", () => {
    const res = inferCategoryAndType("Adidas Ultraboost Running Shoes");
    expect(res.category).toBe("Fashion");
    expect(res.productType).toBe("Running Shoes");
  });

  test("5. Product-type precedence: King Bed Frame resolves to Bed Frame, not generic Bed", () => {
    const res = inferCategoryAndType("Teak Wood King Bed Frame");
    expect(res.category).toBe("Furniture");
    expect(res.productType).toBe("Bed Frame");
  });

  // 3. Keyword fallbacks for domain resolution
  test("6. Category keyword fallbacks prevent leakage into Uncategorized for known domains", () => {
    expect(ELECTRONICS_KEYWORDS.length).toBeGreaterThan(0);
    expect(FASHION_KEYWORDS.length).toBeGreaterThan(0);
    expect(BEAUTY_KEYWORDS.length).toBeGreaterThan(0);
    expect(GROCERY_KEYWORDS.length).toBeGreaterThan(0);
    expect(FURNITURE_KEYWORDS.length).toBeGreaterThan(0);
    expect(BOOKS_KEYWORDS.length).toBeGreaterThan(0);

    const furnFallback = inferCategoryAndType("Vintage Furniture Piece");
    expect(furnFallback.category).toBe("Furniture");
    expect(furnFallback.productType).toBeNull();

    const bookFallback = inferCategoryAndType("Collectible Publication Edition");
    expect(bookFallback.category).toBe("Books");
    expect(bookFallback.productType).toBeNull();
  });

  // 4. Attribute vs Product-Type isolation
  test("7. Technical specs (5G, 16GB RAM, OLED) do NOT become product types", () => {
    const phone = processProduct({ title: "Smartphone 5G 16GB RAM OLED Display", price: 50000, currency: "INR", image: null, url: "https://amazon.in/p1", hostname: "amazon.in" });
    expect(phone.productType).toBe("Smartphone");
    expect(phone.productType).not.toBe("5G");
    expect(phone.productType).not.toBe("16GB RAM");
  });

  // 5. Cross-domain non-interference
  test("8. All seven domains maintain hard domain separation", () => {
    const phone = processProduct({ title: "Samsung Galaxy S24", price: 60000, currency: "INR", image: null, url: "https://amazon.in/p1", hostname: "amazon.in" });
    const shirt = processProduct({ title: "Nike Running Shirt", price: 2000, currency: "INR", image: null, url: "https://nike.com/p2", hostname: "nike.com" });
    const cream = processProduct({ title: "Nivea Moisturizing Cream", price: 300, currency: "INR", image: null, url: "https://nykaa.com/p3", hostname: "nykaa.com" });
    const tea = processProduct({ title: "Tata Tea Gold", price: 250, currency: "INR", image: null, url: "https://blinkit.com/p4", hostname: "blinkit.com" });
    const sofa = processProduct({ title: "IKEA 3 Seater Sofa", price: 20000, currency: "INR", image: null, url: "https://ikea.com/p5", hostname: "ikea.com" });
    const book = processProduct({ title: "Atomic Habits Book", price: 450, currency: "INR", image: null, url: "https://amazon.in/p6", hostname: "amazon.in" });

    expect(compareProducts(phone, shirt).decision).toBe("No Match");
    expect(compareProducts(cream, tea).decision).toBe("No Match");
    expect(compareProducts(sofa, book).decision).toBe("No Match");
    expect(compareProducts(phone, book).decision).toBe("No Match");
  });
});
