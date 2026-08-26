import { describe, test, expect } from "vitest";
import { inferCategoryAndType, determineCategory } from "../../category";
import { routeCategory, ProductCategoryType } from "../../router";
import {
  extractCategoryAttributes,
  createEmptyAttributes,
  type ProductAttributes,
} from "../../attributes";

describe("Phase 4.1 — Universal Category & Attribute Framework Consistency Suite", () => {
  // 1. Electronics Classification
  test("1. Electronics Classification for Devices and Hardware", () => {
    const s24 = inferCategoryAndType("Samsung Galaxy S24 Ultra 5G (Titanium Black, 12GB RAM, 256GB Storage)");
    expect(s24.category).toBe("Electronics");
    expect(s24.productType).toBe("Smartphone");

    const macbook = inferCategoryAndType("Apple MacBook Pro 16 inch M3 Max 36GB 1TB SSD");
    expect(macbook.category).toBe("Electronics");
    expect(macbook.productType).toBe("Laptop");

    const ipad = inferCategoryAndType("Apple iPad Air 11-inch M2 chip 128GB Wi-Fi");
    expect(ipad.category).toBe("Electronics");
    expect(ipad.productType).toBe("Tablet");

    const tv = inferCategoryAndType("Sony Bravia 55 inch 4K Ultra HD Smart OLED TV");
    expect(tv.category).toBe("Electronics");
    expect(tv.productType).toBe("Television");

    const watch = inferCategoryAndType("Apple Watch Series 10 GPS 46mm Smartwatch");
    expect(watch.category).toBe("Electronics");
    expect(watch.productType).toBe("Smartwatch");

    const audio = inferCategoryAndType("Sony WH-1000XM5 Wireless Noise Cancelling Headphones");
    expect(audio.category).toBe("Electronics");
    expect(audio.productType).toBe("Headphones");
  });

  // 2. Fashion Classification
  test("2. Fashion Classification for Apparel, Shoes, and Clothing", () => {
    const shirt = inferCategoryAndType("Levi's Men Slim Fit Cotton Casual Shirt");
    expect(shirt.category).toBe("Fashion");
    expect(shirt.productType).toBe("Shirt");

    const shoes = inferCategoryAndType("Nike Air Max Running Shoes for Men White");
    expect(shoes.category).toBe("Fashion");
    expect(shoes.productType).toBe("Running Shoes");

    const jeans = inferCategoryAndType("Wrangler Regular Fit Blue Denim Jeans");
    expect(jeans.category).toBe("Fashion");
    expect(jeans.productType).toBe("Jeans");
  });

  // 3. Beauty Classification
  test("3. Beauty & Personal Care Classification", () => {
    const serum = inferCategoryAndType("Minimalist 10% Niacinamide Face Serum for Blemish & Acne Marks 30ml");
    expect(serum.category).toBe("Beauty & Personal Care");
    expect(serum.productType).toBe("Serum");

    const shampoo = inferCategoryAndType("L'Oreal Paris Total Repair 5 Shampoo 650ml");
    expect(shampoo.category).toBe("Beauty & Personal Care");
    expect(shampoo.productType).toBe("Shampoo");

    const sunscreen = inferCategoryAndType("Derma Co 1% Hyaluronic Sunscreen Aqua Gel SPF 50");
    expect(sunscreen.category).toBe("Beauty & Personal Care");
    expect(sunscreen.productType).toBe("Sunscreen");
  });

  // 4. Grocery Classification
  test("4. Grocery Classification for Food and Beverage Items", () => {
    const coffee = inferCategoryAndType("Nescafe Classic Instant Coffee Powder 200g Jar");
    expect(coffee.category).toBe("Grocery");
    expect(coffee.productType).toBe("Coffee");

    const tea = inferCategoryAndType("Tata Tea Gold Premium Black Tea 1kg");
    expect(tea.category).toBe("Grocery");
    expect(tea.productType).toBe("Tea");

    const rice = inferCategoryAndType("Fortune Everyday Basmati Rice 5kg");
    expect(rice.category).toBe("Grocery");
    expect(rice.productType).toBe("Rice & Grains");
  });

  // 5. Furniture Classification
  test("5. Furniture Classification for Home and Office Items", () => {
    const desk = inferCategoryAndType("Green Soul Ergonomic Study Table Computer Desk");
    expect(desk.category).toBe("Furniture");
    expect(["Furniture", "Desk"]).toContain(desk.productType);

    const sofa = inferCategoryAndType("Wakefit 3 Seater Fabric Sofa Set Grey");
    expect(sofa.category).toBe("Furniture");
    expect(["Furniture", "Sofa"]).toContain(sofa.productType);
  });

  // 6. Books Classification
  test("6. Books Classification for Novels and Publications", () => {
    const book = inferCategoryAndType("Atomic Habits by James Clear Paperback Book");
    expect(book.category).toBe("Books");
    expect(["Book", "Novel"]).toContain(book.productType);

    const novel = inferCategoryAndType("The Psychology of Money Hardcover Novel");
    expect(novel.category).toBe("Books");
    expect(["Book", "Novel"]).toContain(novel.productType);
  });

  // 7. Unknown / Uncategorized Fallback
  test("7. Uncategorized Fallback for Unidentifiable or Empty Titles", () => {
    const empty1 = inferCategoryAndType("");
    expect(empty1.category).toBe("Uncategorized");
    expect(empty1.productType).toBeNull();

    const empty2 = inferCategoryAndType("   ");
    expect(empty2.category).toBe("Uncategorized");
    expect(empty2.productType).toBeNull();

    const nullTitle = inferCategoryAndType(null);
    expect(nullTitle.category).toBe("Uncategorized");
    expect(nullTitle.productType).toBeNull();

    const legacyEmpty = determineCategory(null);
    expect(legacyEmpty).toBe("Uncategorized");

    const randomGibberish = inferCategoryAndType("XYZ-998877QWERTY Unspecified Object");
    expect(randomGibberish.category).toBe("Uncategorized");
    expect(randomGibberish.productType).toBeNull();
  });

  // 8. Product Type and Category Consistency
  test("8. Product Type and Category Consistency (No Cross-Category Conflicts)", () => {
    const testTitles = [
      "Apple iPhone 16 Pro Max 256GB Desert Titanium",
      "Nike Air Jordan 1 High OG Sneakers",
      "Cetaphil Gentle Skin Cleanser Moisturizing Lotion 500ml",
      "Maggi 2-Minute Instant Noodles 280g Pack",
      "Godrej Interio Solid Wood Dining Table 4 Seater",
      "Sapiens: A Brief History of Humankind Paperback Book",
    ];

    const categoryMap: Record<string, string[]> = {
      Electronics: ["Smartphone", "Laptop", "Tablet", "Headphones", "Earbuds", "Smartwatch", "Television", "Camera", "Monitor", "Keyboard & Mouse", "Speaker"],
      Fashion: ["Shoes", "Apparel", "T-Shirt", "Jeans", "Jacket", "Dress", "Shorts", "Hoodie & Sweatshirt", "Shirt", "Running Shoes", "Sneakers", "Formal Shoes", "Boots", "Sandals & Floaters", "Slides & Flip-Flops", "Sports Cleats", "Training Shoes", "Ethnic Wear"],
      "Beauty & Personal Care": ["Serum", "Shampoo", "Cream & Lotion", "Makeup", "Cleanser", "Sunscreen", "Moisturizer", "Toner", "Face Mask", "Foundation", "Concealer", "Lip Product", "Mascara", "Conditioner", "Hair Treatment", "Fragrance", "Body Care", "Skincare"],
      Grocery: ["Grocery Item", "Beverages", "Coffee", "Tea", "Snacks & Chips", "Biscuits", "Chocolate", "Rice & Grains", "Flour & Pulses", "Noodles & Pasta", "Cooking Oil", "Spices & Seasoning", "Dairy", "Packaged Foods"],
      Furniture: ["Furniture", "Sofa", "Chair", "Recliner", "Dining Table", "Coffee Table", "Side Table", "Desk", "Bed", "Bed Frame", "Wardrobe", "Cabinet", "Bookshelf", "TV Unit", "Dresser", "Mattress"],
      Books: ["Book", "Novel", "Textbook", "Academic Book", "Reference Book", "Guide", "Biography", "Autobiography", "Cookbook", "Children's Book", "Comic & Graphic Novel", "Poetry", "Self-Help", "Fiction", "Non-Fiction"],
    };

    for (const title of testTitles) {
      const res = inferCategoryAndType(title);
      expect(res.category).not.toBe("Uncategorized");
      if (res.productType) {
        expect(categoryMap[res.category]).toContain(res.productType);
      }
    }
  });

  // 9. Category Routing to ProductCategoryType
  test("9. Category Router maps all domain categories cleanly without ambiguity", () => {
    expect(routeCategory("Electronics")).toBe(ProductCategoryType.Electronics);
    expect(routeCategory("smartphone")).toBe(ProductCategoryType.Electronics);
    expect(routeCategory("Mobile Phones")).toBe(ProductCategoryType.Electronics);
    expect(routeCategory("Laptops")).toBe(ProductCategoryType.Electronics);

    expect(routeCategory("Fashion")).toBe(ProductCategoryType.Fashion);
    expect(routeCategory("Clothing & Apparel")).toBe(ProductCategoryType.Fashion);

    expect(routeCategory("Beauty & Personal Care")).toBe(ProductCategoryType.Beauty);
    expect(routeCategory("Skincare & Cosmetics")).toBe(ProductCategoryType.Beauty);

    expect(routeCategory("Grocery")).toBe(ProductCategoryType.Grocery);
    expect(routeCategory("Food & Snacks")).toBe(ProductCategoryType.Grocery);

    expect(routeCategory("Furniture")).toBe(ProductCategoryType.Furniture);
    expect(routeCategory("Home & Living")).toBe(ProductCategoryType.Furniture);

    expect(routeCategory("Books")).toBe(ProductCategoryType.Books);
    expect(routeCategory("Media & Publications")).toBe(ProductCategoryType.Books);

    expect(routeCategory("Uncategorized")).toBe(ProductCategoryType.Unknown);
    expect(routeCategory(null)).toBe(ProductCategoryType.Unknown);
    expect(routeCategory("")).toBe(ProductCategoryType.Unknown);
    expect(routeCategory("Unknown Specialty")).toBe(ProductCategoryType.Unknown);
  });

  // 10. Attribute Dispatcher Routing across all 7 ProductCategoryTypes
  test("10. Attribute Dispatcher Routes Correct Extractor for Every Supported Category Type", () => {
    // Electronics
    const elecAttrs = extractCategoryAttributes(
      "Samsung Galaxy S24 Ultra 12GB RAM 256GB Storage Titanium Black Snapdragon 8 Gen 3 5G 120Hz AMOLED 5000mAh",
      "Electronics"
    );
    expect(elecAttrs.ram).toBe("12GB");
    expect(elecAttrs.storage).toBe("256GB");
    expect(elecAttrs.color?.toLowerCase()).toContain("titanium");
    expect(elecAttrs.processor).toBe("Snapdragon 8 Gen 3");
    expect(elecAttrs.refreshRate).toBe("120Hz");

    // Fashion
    const fashionAttrs = extractCategoryAttributes(
      "Men Blue Slim Fit Cotton Denim Shirt Size L",
      "Fashion"
    );
    expect(fashionAttrs.size?.toUpperCase()).toBe("L");
    expect(fashionAttrs.gender?.toLowerCase()).toBe("men");
    expect(fashionAttrs.material?.toLowerCase()).toBe("cotton");

    // Beauty
    const beautyAttrs = extractCategoryAttributes(
      "Niacinamide Face Serum 30ml Gold Bottle",
      "Beauty & Personal Care"
    );
    expect(beautyAttrs.volume).toBe("30ml");
    expect(beautyAttrs.variant?.toLowerCase()).toBe("serum");
    expect(beautyAttrs.color).toBe("gold");

    // Grocery
    const groceryAttrs = extractCategoryAttributes(
      "Tata Salt Vacuum Evaporated 1kg Pack of 3",
      "Grocery"
    );
    expect(groceryAttrs.weight).toBe("1kg");
    expect(groceryAttrs.packCount).toContain("3");

    // Furniture
    const furnAttrs = extractCategoryAttributes(
      "Solid Wood Office Table 120x60x75 cm Brown",
      "Furniture"
    );
    expect(furnAttrs.material?.toLowerCase()).toContain("wood");
    expect(furnAttrs.color?.toLowerCase()).toBe("brown");
    expect(furnAttrs.size).toContain("120x60x75");

    // Books
    const bookAttrs = extractCategoryAttributes(
      "Clean Code by Robert C Martin Paperback English 1st Edition",
      "Books"
    );
    expect(bookAttrs.format?.toLowerCase()).toBe("paperback");
    expect(bookAttrs.language?.toLowerCase()).toBe("english");
    expect(bookAttrs.edition?.toLowerCase()).toContain("1st");

    // Unknown Category
    const unknownAttrs = extractCategoryAttributes(
      "Generic Hardware Gizmo Red 100g",
      "Uncategorized"
    );
    expect(unknownAttrs.color?.toLowerCase()).toBe("red");
    expect(unknownAttrs.storage).toBeNull();
    expect(unknownAttrs.processor).toBeNull();
  });

  // 11. Missing-Data Behavior and createEmptyAttributes Completeness
  test("11. Missing-Data Behavior Remains Null Without Fabrication", () => {
    const empty = createEmptyAttributes();

    // Verify all 44 specification fields are initialized to null
    const expectedNullKeys: (keyof ProductAttributes)[] = [
      "storage", "ram", "color", "size", "variant", "material", "dimensions",
      "weight", "volume", "gender", "language", "format", "edition", "packCount",
      "processor", "gpu", "battery", "display", "author", "publisher", "isbn",
      "displaySize", "resolution", "refreshRate", "displayTechnology",
      "batteryCapacity", "chargingCapability", "cameraSpecs", "connectivity",
      "networkGeneration", "operatingSystem", "ports", "wirelessStandards",
      "generation", "regionVersion", "warranty", "variantSignature",
      "style", "spf", "ingredient", "formulation", "shade", "skinType", "flavor"
    ];

    expect(Object.keys(empty)).toHaveLength(expectedNullKeys.length);
    for (const key of expectedNullKeys) {
      expect(empty[key]).toBeNull();
    }
  });
});
