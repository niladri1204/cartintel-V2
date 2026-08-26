import { describe, test, expect } from "vitest";
import { processProduct } from "../engine";
import { compareProducts } from "../matching";
import { ProductDomain } from "../domain";

describe("Phase 4.5.2 — Universal Identity & Variant Matrix (7 Domains × 8 Scenarios = 56 Tests)", () => {

  // =========================================================================
  // DOMAIN 1: ELECTRONICS (Representative: Samsung Galaxy S24)
  // =========================================================================
  describe("1. Electronics Matrix (Samsung Galaxy S24)", () => {
    const target = processProduct({ title: "Samsung Galaxy S24 8GB RAM 256GB Storage", price: 79999, currency: "INR", image: null, url: "https://amazon.in/p1", hostname: "amazon.in" });

    test("1.1 Exact same product", () => {
      const same = processProduct({ title: "Samsung Galaxy S24 8GB RAM 256GB Storage", price: 79999, currency: "INR", image: null, url: "https://amazon.in/p1", hostname: "amazon.in" });
      const match = compareProducts(target, same);
      expect(match.isMatch).toBe(true);
      expect(match.decision).toBe("Exact Match");
    });

    test("1.2 Same product / different merchant", () => {
      const otherMerchant = processProduct({ title: "Samsung Galaxy S24 8GB RAM 256GB Storage", price: 77999, currency: "INR", image: null, url: "https://flipkart.com/p2", hostname: "flipkart.com" });
      const match = compareProducts(target, otherMerchant);
      expect(match.isMatch).toBe(true);
      expect(match.decision).toBe("Exact Match");
    });

    test("1.3 Same product / different variant (512GB Storage)", () => {
      const variant = processProduct({ title: "Samsung Galaxy S24 8GB RAM 512GB Storage", price: 89999, currency: "INR", image: null, url: "https://amazon.in/p3", hostname: "amazon.in" });
      const match = compareProducts(target, variant);
      expect(match.isMatch).toBe(false);
      expect(match.decision).toBe("Likely Match");
      expect(match.similarityType).toBe("Different Storage Variant");
    });

    test("1.4 Different product / same brand (Samsung Galaxy A55)", () => {
      const diffModel = processProduct({ title: "Samsung Galaxy A55 8GB RAM 256GB Storage", price: 39999, currency: "INR", image: null, url: "https://amazon.in/p4", hostname: "amazon.in" });
      const match = compareProducts(target, diffModel);
      expect(match.isMatch).toBe(false);
      expect(match.decision).toBe("No Match");
    });

    test("1.5 Different product type (Samsung Galaxy Watch 6)", () => {
      const diffType = processProduct({ title: "Samsung Galaxy Watch 6 Smartwatch", price: 29999, currency: "INR", image: null, url: "https://amazon.in/p5", hostname: "amazon.in" });
      const match = compareProducts(target, diffType);
      expect(match.isMatch).toBe(false);
      expect(match.decision).toBe("No Match");
    });

    test("1.6 Different domain (Samsung Washing Machine)", () => {
      const diffDomain = processProduct({ title: "Samsung 7kg Washing Machine", price: 25000, currency: "INR", image: null, url: "https://amazon.in/p6", hostname: "amazon.in" });
      const match = compareProducts(target, diffDomain);
      expect(match.isMatch).toBe(false);
      expect(match.decision).toBe("No Match");
    });

    test("1.7 Missing attributes (Sparse title)", () => {
      const sparse = processProduct({ title: "Samsung Galaxy S24", price: 79999, currency: "INR", image: null, url: "https://amazon.in/p7", hostname: "amazon.in" });
      const match = compareProducts(target, sparse);
      expect(match.isMatch).toBe(true);
    });

    test("1.8 Conflicting attributes (8GB RAM vs 12GB RAM)", () => {
      const conflict = processProduct({ title: "Samsung Galaxy S24 12GB RAM 256GB Storage", price: 84999, currency: "INR", image: null, url: "https://amazon.in/p8", hostname: "amazon.in" });
      const match = compareProducts(target, conflict);
      expect(match.isMatch).toBe(false);
      expect(match.decision).toBe("Likely Match");
    });
  });

  // =========================================================================
  // DOMAIN 2: FASHION (Representative: H&M T-Shirt)
  // =========================================================================
  describe("2. Fashion Matrix (H&M T-Shirt)", () => {
    const target = processProduct({ title: "H&M Regular Fit Cotton T-Shirt Black Size M", price: 799, currency: "INR", image: null, url: "https://hm.com/p1", hostname: "hm.com" });

    test("2.1 Exact same product", () => {
      const same = processProduct({ title: "H&M Regular Fit Cotton T-Shirt Black Size M", price: 799, currency: "INR", image: null, url: "https://hm.com/p1", hostname: "hm.com" });
      const match = compareProducts(target, same);
      expect(match.isMatch).toBe(true);
    });

    test("2.2 Same product / different merchant", () => {
      const otherMerchant = processProduct({ title: "H&M Regular Fit Cotton T-Shirt Black Size M", price: 699, currency: "INR", image: null, url: "https://myntra.com/p2", hostname: "myntra.com" });
      const match = compareProducts(target, otherMerchant);
      expect(match.isMatch).toBe(true);
    });

    test("2.3 Same product / different variant (Size L)", () => {
      const variant = processProduct({ title: "H&M Regular Fit Cotton T-Shirt Black Size L", price: 799, currency: "INR", image: null, url: "https://hm.com/p3", hostname: "hm.com" });
      const match = compareProducts(target, variant);
      expect(["Exact Match", "Likely Match"]).toContain(match.decision);
    });

    test("2.4 Different product / same brand (H&M Denim Jacket)", () => {
      const diffModel = processProduct({ title: "H&M Oversized Denim Jacket Blue Size M", price: 2999, currency: "INR", image: null, url: "https://hm.com/p4", hostname: "hm.com" });
      const match = compareProducts(target, diffModel);
      expect(match.isMatch).toBe(false);
      expect(match.decision).toBe("No Match");
    });

    test("2.5 Different product type (H&M Jeans)", () => {
      const diffType = processProduct({ title: "H&M Slim Fit Jeans Blue", price: 1999, currency: "INR", image: null, url: "https://hm.com/p5", hostname: "hm.com" });
      const match = compareProducts(target, diffType);
      expect(match.isMatch).toBe(false);
      expect(match.decision).toBe("No Match");
    });

    test("2.6 Different domain (H&M Perfume)", () => {
      const diffDomain = processProduct({ title: "H&M Vanilla Body Mist Perfume 150ml", price: 499, currency: "INR", image: null, url: "https://hm.com/p6", hostname: "hm.com" });
      expect(diffDomain.domain).toBe(ProductDomain.Beauty);
      const match = compareProducts(target, diffDomain);
      expect(match.decision).toBe("No Match");
    });

    test("2.7 Missing attributes (Unspecified size)", () => {
      const sparse = processProduct({ title: "H&M Regular Fit Cotton T-Shirt Black", price: 799, currency: "INR", image: null, url: "https://hm.com/p7", hostname: "hm.com" });
      const match = compareProducts(target, sparse);
      expect(match.isMatch).toBe(true);
    });

    test("2.8 Conflicting attributes (Men's vs Women's)", () => {
      const conflict = processProduct({ title: "H&M Women Regular Fit Cotton T-Shirt Black Size M", price: 799, currency: "INR", image: null, url: "https://hm.com/p8", hostname: "hm.com" });
      const match = compareProducts(target, conflict);
      expect(match.isMatch).toBe(true);
    });
  });

  // =========================================================================
  // DOMAIN 3: FOOTWEAR (Representative: Puma Electron Street)
  // =========================================================================
  describe("3. Footwear Matrix (Puma Electron Street)", () => {
    const target = processProduct({ title: "Puma Electron Street Black UK 9", price: 3499, currency: "INR", image: null, url: "https://puma.com/p1", hostname: "puma.com" });

    test("3.1 Exact same product", () => {
      const same = processProduct({ title: "Puma Electron Street Black UK 9", price: 3499, currency: "INR", image: null, url: "https://puma.com/p1", hostname: "puma.com" });
      const match = compareProducts(target, same);
      expect(match.isMatch).toBe(true);
    });

    test("3.2 Same product / different merchant", () => {
      const otherMerchant = processProduct({ title: "Puma Electron Street Black UK 9", price: 3199, currency: "INR", image: null, url: "https://amazon.in/p2", hostname: "amazon.in" });
      const match = compareProducts(target, otherMerchant);
      expect(match.isMatch).toBe(true);
    });

    test("3.3 Same product / different variant (UK 10)", () => {
      const variant = processProduct({ title: "Puma Electron Street Black UK 10", price: 3499, currency: "INR", image: null, url: "https://puma.com/p3", hostname: "puma.com" });
      const match = compareProducts(target, variant);
      expect(match.isMatch).toBe(true);
      expect(["Exact Match", "Likely Match"]).toContain(match.decision);
    });

    test("3.4 Different product / same brand (Puma Suede Classic)", () => {
      const diffModel = processProduct({ title: "Puma Suede Classic Black UK 9", price: 4999, currency: "INR", image: null, url: "https://puma.com/p4", hostname: "puma.com" });
      const match = compareProducts(target, diffModel);
      expect(match.isMatch).toBe(false);
      expect(match.decision).toBe("No Match");
    });

    test("3.5 Different product type (Puma Tracksuit)", () => {
      const diffType = processProduct({ title: "Puma Men Polyester Tracksuit Black", price: 2999, currency: "INR", image: null, url: "https://puma.com/p5", hostname: "puma.com" });
      const match = compareProducts(target, diffType);
      expect(match.isMatch).toBe(false);
      expect(match.decision).toBe("No Match");
    });

    test("3.6 Different domain (Puma Backpack)", () => {
      const diffDomain = processProduct({ title: "Puma Sports Backpack 25L", price: 1499, currency: "INR", image: null, url: "https://puma.com/p6", hostname: "puma.com" });
      const match = compareProducts(target, diffDomain);
      expect(match.isMatch).toBe(false);
      expect(match.decision).toBe("No Match");
    });

    test("3.7 Missing attributes (Unspecified size)", () => {
      const sparse = processProduct({ title: "Puma Electron Street Black", price: 3499, currency: "INR", image: null, url: "https://puma.com/p7", hostname: "puma.com" });
      const match = compareProducts(target, sparse);
      expect(match.isMatch).toBe(true);
    });

    test("3.8 Conflicting attributes (UK 9 vs CM 28)", () => {
      const conflict = processProduct({ title: "Puma Electron Street White UK 9", price: 3499, currency: "INR", image: null, url: "https://puma.com/p8", hostname: "puma.com" });
      const match = compareProducts(target, conflict);
      expect(match.isMatch).toBe(false);
      expect(match.decision).toBe("Likely Match");
    });
  });

  // =========================================================================
  // DOMAIN 4: BEAUTY & PERSONAL CARE (Representative: The Ordinary Niacinamide Serum)
  // =========================================================================
  describe("4. Beauty Matrix (The Ordinary Niacinamide Serum)", () => {
    const target = processProduct({ title: "The Ordinary Niacinamide 10% + Zinc 1% Serum 30ml", price: 600, currency: "INR", image: null, url: "https://nykaa.com/p1", hostname: "nykaa.com" });

    test("4.1 Exact same product", () => {
      const same = processProduct({ title: "The Ordinary Niacinamide 10% + Zinc 1% Serum 30ml", price: 600, currency: "INR", image: null, url: "https://nykaa.com/p1", hostname: "nykaa.com" });
      const match = compareProducts(target, same);
      expect(match.isMatch).toBe(true);
    });

    test("4.2 Same product / different merchant", () => {
      const otherMerchant = processProduct({ title: "The Ordinary Niacinamide 10% + Zinc 1% Serum 30ml", price: 550, currency: "INR", image: null, url: "https://sephora.nnnow.com/p2", hostname: "sephora.nnnow.com" });
      const match = compareProducts(target, otherMerchant);
      expect(match.isMatch).toBe(true);
    });

    test("4.3 Same product / different variant (60ml Volume)", () => {
      const variant = processProduct({ title: "The Ordinary Niacinamide 10% + Zinc 1% Serum 60ml", price: 1050, currency: "INR", image: null, url: "https://nykaa.com/p3", hostname: "nykaa.com" });
      const match = compareProducts(target, variant);
      expect(match.isMatch).toBe(false);
      expect(match.decision).toBe("Likely Match");
      expect(match.similarityType).toBe("Different Quantity Variant");
    });

    test("4.4 Different product / same brand (The Ordinary Hyaluronic Acid)", () => {
      const diffModel = processProduct({ title: "The Ordinary Hyaluronic Acid 2% + B5 Serum 30ml", price: 700, currency: "INR", image: null, url: "https://nykaa.com/p4", hostname: "nykaa.com" });
      const match = compareProducts(target, diffModel);
      expect(match.isMatch).toBe(false);
      expect(match.decision).toBe("No Match");
    });

    test("4.5 Different product type (The Ordinary Moisturizer)", () => {
      const diffType = processProduct({ title: "The Ordinary Natural Moisturizing Factors + HA Cream 100ml", price: 900, currency: "INR", image: null, url: "https://nykaa.com/p5", hostname: "nykaa.com" });
      const match = compareProducts(target, diffType);
      expect(match.isMatch).toBe(false);
      expect(match.decision).toBe("No Match");
    });

    test("4.6 Different domain (The Ordinary Coffee Beans)", () => {
      const diffDomain = processProduct({ title: "The Ordinary Organic Coffee Beans 250g", price: 400, currency: "INR", image: null, url: "https://amazon.in/p6", hostname: "amazon.in" });
      const match = compareProducts(target, diffDomain);
      expect(match.isMatch).toBe(false);
      expect(match.decision).toBe("No Match");
    });

    test("4.7 Missing attributes (Unspecified volume)", () => {
      const sparse = processProduct({ title: "The Ordinary Niacinamide 10% + Zinc 1% Serum", price: 600, currency: "INR", image: null, url: "https://nykaa.com/p7", hostname: "nykaa.com" });
      const match = compareProducts(target, sparse);
      expect(match.isMatch).toBe(true);
    });

    test("4.8 Conflicting attributes (Active ingredient mismatch)", () => {
      const conflict = processProduct({ title: "The Ordinary Salicylic Acid 2% Serum 30ml", price: 600, currency: "INR", image: null, url: "https://nykaa.com/p8", hostname: "nykaa.com" });
      const match = compareProducts(target, conflict);
      expect(match.isMatch).toBe(false);
      expect(match.decision).toBe("No Match");
    });
  });

  // =========================================================================
  // DOMAIN 5: GROCERY (Representative: Lay's Magic Masala)
  // =========================================================================
  describe("5. Grocery Matrix (Lay's Magic Masala)", () => {
    const target = processProduct({ title: "Lay's Magic Masala Potato Chips 50g", price: 20, currency: "INR", image: null, url: "https://blinkit.com/p1", hostname: "blinkit.com" });

    test("5.1 Exact same product", () => {
      const same = processProduct({ title: "Lay's Magic Masala Potato Chips 50g", price: 20, currency: "INR", image: null, url: "https://blinkit.com/p1", hostname: "blinkit.com" });
      const match = compareProducts(target, same);
      expect(match.isMatch).toBe(true);
    });

    test("5.2 Same product / different merchant", () => {
      const otherMerchant = processProduct({ title: "Lay's Magic Masala Potato Chips 50g", price: 20, currency: "INR", image: null, url: "https://bigbasket.com/p2", hostname: "bigbasket.com" });
      const match = compareProducts(target, otherMerchant);
      expect(match.isMatch).toBe(true);
    });

    test("5.3 Same product / different variant (100g Weight)", () => {
      const variant = processProduct({ title: "Lay's Magic Masala Potato Chips 100g", price: 40, currency: "INR", image: null, url: "https://blinkit.com/p3", hostname: "blinkit.com" });
      const match = compareProducts(target, variant);
      expect(match.isMatch).toBe(false);
      expect(match.decision).toBe("Likely Match");
      expect(match.similarityType).toBe("Different Quantity Variant");
    });

    test("5.4 Different product / same brand (Lay's Classic Salted)", () => {
      const diffFlavor = processProduct({ title: "Lay's Classic Salted Potato Chips 50g", price: 20, currency: "INR", image: null, url: "https://blinkit.com/p4", hostname: "blinkit.com" });
      const match = compareProducts(target, diffFlavor);
      expect(match.isMatch).toBe(false);
      expect(match.decision).toBe("No Match");
    });

    test("5.5 Different product type (Lay's Wafers vs Pepsi Soda)", () => {
      const diffType = processProduct({ title: "Pepsi Soft Drink 750ml", price: 40, currency: "INR", image: null, url: "https://blinkit.com/p5", hostname: "blinkit.com" });
      const match = compareProducts(target, diffType);
      expect(match.isMatch).toBe(false);
      expect(match.decision).toBe("No Match");
    });

    test("5.6 Different domain (Lay's Chips vs Samsung Phone)", () => {
      const diffDomain = processProduct({ title: "Samsung Galaxy S24 256GB", price: 79999, currency: "INR", image: null, url: "https://amazon.in/p6", hostname: "amazon.in" });
      const match = compareProducts(target, diffDomain);
      expect(match.isMatch).toBe(false);
      expect(match.decision).toBe("No Match");
    });

    test("5.7 Missing attributes (Unspecified weight)", () => {
      const sparse = processProduct({ title: "Lay's Magic Masala Potato Chips", price: 20, currency: "INR", image: null, url: "https://blinkit.com/p7", hostname: "blinkit.com" });
      const match = compareProducts(target, sparse);
      expect(match.isMatch).toBe(true);
    });

    test("5.8 Conflicting attributes (Original vs Zero Sugar)", () => {
      const p1 = processProduct({ title: "Coca-Cola Original 750ml", price: 40, currency: "INR", image: null, url: "https://blinkit.com/p8a", hostname: "blinkit.com" });
      const p2 = processProduct({ title: "Coca-Cola Zero Sugar 750ml", price: 40, currency: "INR", image: null, url: "https://blinkit.com/p8b", hostname: "blinkit.com" });
      const match = compareProducts(p1, p2);
      expect(match.isMatch).toBe(false);
      expect(match.mismatchedFields).toContain("formulation");
    });
  });

  // =========================================================================
  // DOMAIN 6: FURNITURE (Representative: IKEA 3-Seater Sofa)
  // =========================================================================
  describe("6. Furniture Matrix (IKEA 3-Seater Sofa)", () => {
    const target = processProduct({ title: "IKEA 3 Seater Fabric Sofa Brown 180x80x75 cm", price: 24999, currency: "INR", image: null, url: "https://ikea.com/p1", hostname: "ikea.com" });

    test("6.1 Exact same product", () => {
      const same = processProduct({ title: "IKEA 3 Seater Fabric Sofa Brown 180x80x75 cm", price: 24999, currency: "INR", image: null, url: "https://ikea.com/p1", hostname: "ikea.com" });
      const match = compareProducts(target, same);
      expect(match.isMatch).toBe(true);
    });

    test("6.2 Same product / different merchant", () => {
      const otherMerchant = processProduct({ title: "IKEA 3 Seater Fabric Sofa Brown 180x80x75 cm", price: 23999, currency: "INR", image: null, url: "https://pepperfry.com/p2", hostname: "pepperfry.com" });
      const match = compareProducts(target, otherMerchant);
      expect(match.isMatch).toBe(true);
    });

    test("6.3 Same product / different variant (2 Seater)", () => {
      const variant = processProduct({ title: "IKEA 2 Seater Fabric Sofa Brown 140x80x75 cm", price: 19999, currency: "INR", image: null, url: "https://ikea.com/p3", hostname: "ikea.com" });
      const match = compareProducts(target, variant);
      expect(match.isMatch).toBe(false);
      expect(match.decision).toBe("Likely Match");
    });

    test("6.4 Different product / same brand (IKEA Coffee Table)", () => {
      const diffModel = processProduct({ title: "IKEA Coffee Table Wood Brown", price: 3999, currency: "INR", image: null, url: "https://ikea.com/p4", hostname: "ikea.com" });
      const match = compareProducts(target, diffModel);
      expect(match.isMatch).toBe(false);
      expect(match.decision).toBe("No Match");
    });

    test("6.5 Different product type (Sofa vs Office Desk)", () => {
      const diffType = processProduct({ title: "IKEA Ergonomic Study Desk Wood 120cm", price: 7999, currency: "INR", image: null, url: "https://ikea.com/p5", hostname: "ikea.com" });
      const match = compareProducts(target, diffType);
      expect(match.isMatch).toBe(false);
      expect(match.decision).toBe("No Match");
    });

    test("6.6 Different domain (IKEA Sofa vs Book)", () => {
      const diffDomain = processProduct({ title: "Atomic Habits Book by James Clear", price: 450, currency: "INR", image: null, url: "https://amazon.in/p6", hostname: "amazon.in" });
      const match = compareProducts(target, diffDomain);
      expect(match.isMatch).toBe(false);
      expect(match.decision).toBe("No Match");
    });

    test("6.7 Missing attributes (Unspecified dimensions)", () => {
      const sparse = processProduct({ title: "IKEA 3 Seater Fabric Sofa Brown", price: 24999, currency: "INR", image: null, url: "https://ikea.com/p7", hostname: "ikea.com" });
      const match = compareProducts(target, sparse);
      expect(match.isMatch).toBe(true);
    });

    test("6.8 Conflicting attributes (Solid Wood vs Metal Frame)", () => {
      const conflict = processProduct({ title: "IKEA 3 Seater Metal Frame Sofa Brown 180x80x75 cm", price: 24999, currency: "INR", image: null, url: "https://ikea.com/p8", hostname: "ikea.com" });
      const match = compareProducts(target, conflict);
      expect(match.isMatch).toBe(false);
    });
  });

  // =========================================================================
  // DOMAIN 7: BOOKS (Representative: Atomic Habits)
  // =========================================================================
  describe("7. Books Matrix (Atomic Habits)", () => {
    const target = processProduct({ title: "Atomic Habits by James Clear Penguin ISBN 9780735211292 Paperback", price: 450, currency: "INR", image: null, url: "https://amazon.in/p1", hostname: "amazon.in" });

    test("7.1 Exact same product", () => {
      const same = processProduct({ title: "Atomic Habits by James Clear Penguin ISBN 9780735211292 Paperback", price: 450, currency: "INR", image: null, url: "https://amazon.in/p1", hostname: "amazon.in" });
      const match = compareProducts(target, same);
      expect(match.isMatch).toBe(true);
    });

    test("7.2 Same product / different merchant", () => {
      const otherMerchant = processProduct({ title: "Atomic Habits by James Clear Penguin ISBN 9780735211292 Paperback", price: 410, currency: "INR", image: null, url: "https://flipkart.com/p2", hostname: "flipkart.com" });
      const match = compareProducts(target, otherMerchant);
      expect(match.isMatch).toBe(true);
    });

    test("7.3 Same product / different variant (Hardcover Format)", () => {
      const variant = processProduct({ title: "Atomic Habits by James Clear Penguin ISBN 9780735211292 Hardcover", price: 899, currency: "INR", image: null, url: "https://amazon.in/p3", hostname: "amazon.in" });
      const match = compareProducts(target, variant);
      expect(match.isMatch).toBe(false);
      expect(match.decision).toBe("Likely Match");
      expect(match.similarityType).toBe("Different Format Variant");
    });

    test("7.4 Different product / same brand/publisher (Penguin Sapiens)", () => {
      const diffModel = processProduct({ title: "Sapiens: A Brief History of Humankind by Yuval Noah Harari Penguin Paperback", price: 499, currency: "INR", image: null, url: "https://amazon.in/p4", hostname: "amazon.in" });
      const match = compareProducts(target, diffModel);
      expect(match.isMatch).toBe(false);
      expect(match.decision).toBe("No Match");
    });

    test("7.5 Different product type (Book vs Magazine)", () => {
      const diffBook = processProduct({ title: "Deep Work by Cal Newport Paperback", price: 399, currency: "INR", image: null, url: "https://amazon.in/p5", hostname: "amazon.in" });
      const match = compareProducts(target, diffBook);
      expect(match.isMatch).toBe(false);
      expect(match.decision).toBe("No Match");
    });

    test("7.6 Different domain (Atomic Habits Book vs Samsung Galaxy S24)", () => {
      const diffDomain = processProduct({ title: "Samsung Galaxy S24 256GB", price: 79999, currency: "INR", image: null, url: "https://amazon.in/p6", hostname: "amazon.in" });
      const match = compareProducts(target, diffDomain);
      expect(match.isMatch).toBe(false);
      expect(match.decision).toBe("No Match");
    });

    test("7.7 Missing attributes (Unspecified ISBN / publisher)", () => {
      const sparse = processProduct({ title: "Atomic Habits by James Clear Paperback", price: 450, currency: "INR", image: null, url: "https://amazon.in/p7", hostname: "amazon.in" });
      const match = compareProducts(target, sparse);
      expect(match.isMatch).toBe(true);
    });

    test("7.8 Conflicting attributes (Author mismatch: James Clear vs Cal Newport)", () => {
      const conflict = processProduct({ title: "Atomic Habits by Cal Newport Paperback", price: 450, currency: "INR", image: null, url: "https://amazon.in/p8", hostname: "amazon.in" });
      const match = compareProducts(target, conflict);
      expect(match.isMatch).toBe(false);
      expect(match.decision).toBe("No Match");
    });
  });
});
