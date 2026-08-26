import { describe, test, expect } from 'vitest';
import { processProduct } from '../engine';
import { compareProducts } from '../matching';
import { normalizeMarketplaceName } from '../marketplace';
import { rankDeals } from '../ranking';
import { recommendDeal } from '../recommendation';
import { resolveProducts, buildProductIdentities } from '../resolver';

describe('Product Intelligence Engine - Category & Product Type Inference', () => {
  const getProduct = (title: string) => {
    return processProduct({
      title,
      price: 999,
      currency: 'USD',
      image: 'http://example.com/img.jpg',
      url: 'http://example.com',
      hostname: 'example.com'
    });
  };

  test('1. Samsung Galaxy S25 → Electronics / Smartphone', () => {
    const product = getProduct('Samsung Galaxy S25 5G 256GB 12GB RAM');
    expect(product.category).toBe('Electronics');
    expect(product.productType).toBe('Smartphone');
  });

  test('2. iPhone 16 Pro → Electronics / Smartphone', () => {
    const product = getProduct('iPhone 16 Pro 256GB Natural Titanium');
    expect(product.category).toBe('Electronics');
    expect(product.productType).toBe('Smartphone');
  });

  test('3. Google Pixel 10 → Electronics / Smartphone', () => {
    const product = getProduct('Google Pixel 10 (Obsidian, 256 GB)');
    expect(product.category).toBe('Electronics');
    expect(product.productType).toBe('Smartphone');
  });

  test('4. Nothing Phone (3) → Electronics / Smartphone', () => {
    const product = getProduct('Nothing Phone (3), Black (12GB, 256GB)');
    expect(product.category).toBe('Electronics');
    expect(product.productType).toBe('Smartphone');
  });

  test('5. MacBook Air M4 → Electronics / Laptop', () => {
    const product = getProduct('MacBook Air M4 16GB 512GB SSD');
    expect(product.category).toBe('Electronics');
    expect(product.productType).toBe('Laptop');
  });

  test('6. Sony WH-1000XM6 → Electronics / Headphones', () => {
    const product = getProduct('Sony WH-1000XM6 Wireless Noise Canceling Headphones');
    expect(product.category).toBe('Electronics');
    expect(product.productType).toBe('Headphones');
  });

  test('7. Galaxy Buds → Electronics / Earbuds', () => {
    const product = getProduct('Samsung Galaxy Buds3 Pro TWS');
    expect(product.category).toBe('Electronics');
    expect(product.productType).toBe('Earbuds');
  });

  test('8. Loreal Paris Revitalift Serum → Beauty & Personal Care / Serum', () => {
    const product = getProduct('Loreal Paris Revitalift Serum');
    expect(product.category).toBe('Beauty & Personal Care');
    expect(product.productType).toBe('Serum');

    const fashionProduct = getProduct('Nike running shoes');
    expect(fashionProduct.category).toBe('Fashion');
    expect(["Shoes", "Running Shoes"]).toContain(fashionProduct.productType);
  });

  test('9. Generic Item X100 → Uncategorized / Null', () => {
    const product = getProduct('Generic Item X100');
    expect(product.category).toBe('Uncategorized');
    expect(product.productType).toBeNull();
  });
});

describe('Product Identity Extraction & Model Matching Redesign', () => {
  const getProduct = (title: string) => {
    return processProduct({
      title,
      price: 50000,
      currency: 'INR',
      image: 'http://example.com/img.jpg',
      url: 'http://example.com',
      hostname: 'example.com'
    });
  };

  test('1. Model extraction from noisy Amazon/Croma title for Nothing Phone (3)', () => {
    const noisyTitle = "Nothing Phone (3), Black (12GB, 256GB) | Snapdragon 8s Gen 4 | 50MP + 50MP + 50MP Rear Camera | 1.5K+ 120Hz AMOLED Flexible LTPS Display";
    const product = getProduct(noisyTitle);

    expect(product.brand).toBe('nothing');
    expect(product.model).toBe('phone 3');
    expect(product.color).toBe('black');
    expect(product.ram?.toLowerCase()).toBe('12gb');
    expect(product.storage?.toLowerCase()).toBe('256gb');
  });

  test('2. Noisy long Amazon title vs clean marketplace title (Strong Match)', () => {
    const noisyTitle = "Nothing Phone (3), Black (12GB, 256GB) | Snapdragon 8s Gen 4 | 50MP + 50MP + 50MP Rear Camera | 1.5K+ 120Hz AMOLED Flexible LTPS Display";
    const cleanTitle = "Nothing Phone (3) 12GB RAM 256GB Storage Black";

    const p1 = getProduct(noisyTitle);
    const p2 = getProduct(cleanTitle);

    const match = compareProducts(p1, p2);

    expect(match.isMatch).toBe(true);
    expect(match.score).toBeGreaterThanOrEqual(90);
  });

  test('3. Same model with different RAM/storage (Match but Variant Mismatch)', () => {
    const p1 = getProduct("Nothing Phone (3) 12GB RAM 256GB Storage Black");
    const p2 = getProduct("Nothing Phone (3) 8GB RAM 128GB Storage Black");

    const match = compareProducts(p1, p2);

    expect(match.decision).toBe("Likely Match");
    expect(match.mismatchedFields).toContain("ram");
    expect(match.mismatchedFields).toContain("storage");
  });

  test('4. Nothing Phone (3) vs Nothing Phone (2) (Rejection due to model number)', () => {
    const p1 = getProduct("Nothing Phone (3) 12GB RAM 256GB Storage");
    const p2 = getProduct("Nothing Phone (2) 12GB RAM 256GB Storage");

    const match = compareProducts(p1, p2);

    expect(match.isMatch).toBe(false);
    expect(match.decision).toBe("No Match");
    expect(match.similarityType).toBe("Different Product");
  });

  test('5. Nothing Phone (3) vs Nothing Phone (2a) (Rejection due to model version suffix)', () => {
    const p1 = getProduct("Nothing Phone (3) 12GB RAM 256GB Storage");
    const p2 = getProduct("Nothing Phone (2a) 12GB RAM 256GB Storage");

    const match = compareProducts(p1, p2);

    expect(match.isMatch).toBe(false);
    expect(match.decision).toBe("No Match");
    expect(match.similarityType).toBe("Different Product");
  });

  test('6. Nothing Phone vs Unrelated Nothing Product (Nothing Earbuds)', () => {
    const p1 = getProduct("Nothing Phone (3)");
    const p2 = getProduct("Nothing Ear (2) Wireless Earbuds");

    const match = compareProducts(p1, p2);

    expect(match.isMatch).toBe(false);
    expect(match.decision).toBe("No Match");
    expect(match.similarityType).toBe("Different Product");
  });
});

describe('Marketplace Normalization & Recommendation Pipeline (Pixel 8a Regression Suite)', () => {
  test('1. Marketplace Normalization maps domains correctly and avoids "Google"', () => {
    expect(normalizeMarketplaceName("Google", "https://www.flipkart.com/google-pixel-8a-obsidian-128-gb/p/itm")).toBe("Flipkart");
    expect(normalizeMarketplaceName("Google", "https://www.croma.com/google-pixel-8a-8gb-ram-128gb/p/234")).toBe("Croma");
    expect(normalizeMarketplaceName("Amazon.in", "https://www.amazon.in/dp/B0D3BD")).toBe("Amazon");
    expect(normalizeMarketplaceName("Google", "https://www.google.com/shopping/product/1")).toBe("Unknown seller/site");
    expect(normalizeMarketplaceName(null, null)).toBe("Unknown seller/site");
  });

  test('2. Pixel 8a (128GB / 8GB) Amazon ₹36,999 vs Flipkart ₹27,699 (Cheaper Valid Offer Recommended)', () => {
    const amazonCurrent = processProduct({
      title: "Google Pixel 8a (Obsidian, 128GB, 8GB RAM)",
      price: 36999,
      currency: "INR",
      image: "http://example.com/img.jpg",
      url: "https://www.amazon.in/dp/B0D3BD",
      hostname: "www.amazon.in"
    });

    const flipkartCandidate = processProduct({
      title: "Google Pixel 8a (Obsidian, 128 GB) (8 GB RAM)",
      price: 27699,
      currency: "INR",
      image: "http://example.com/img.jpg",
      url: "https://www.flipkart.com/google-pixel-8a",
      hostname: "www.flipkart.com"
    });
    flipkartCandidate.metadata.marketplace = "Flipkart";

    const clusters = resolveProducts([amazonCurrent, flipkartCandidate]);
    const identity = buildProductIdentities(clusters)[0];
    const ranked = rankDeals(identity);
    const rec = recommendDeal(ranked);

    expect(rec.state).toBe("recommended_deal");
    expect(rec.recommendedOffer?.product.metadata.marketplace).toBe("Flipkart");
    expect(rec.recommendedOffer?.savingsValue).toBe(9300);
    expect(rec.reason).toContain("Save ₹9,300 (25%)");
  });

  test('3. Pixel 8a: Cheapest offer with conflicting storage (256GB vs 128GB) is excluded from recommendation', () => {
    const amazonCurrent = processProduct({
      title: "Google Pixel 8a (Obsidian, 128GB, 8GB RAM)",
      price: 36999,
      currency: "INR",
      image: "http://example.com/img.jpg",
      url: "https://www.amazon.in/dp/B0D3BD",
      hostname: "www.amazon.in"
    });

    const cromaWrongStorage = processProduct({
      title: "Google Pixel 8a (Obsidian, 256GB, 8GB RAM)",
      price: 22999,
      currency: "INR",
      image: "http://example.com/img.jpg",
      url: "https://www.croma.com/google-pixel-8a-256gb",
      hostname: "www.croma.com"
    });

    const clusters = resolveProducts([amazonCurrent, cromaWrongStorage]);
    const identity = buildProductIdentities(clusters)[0];
    const ranked = rankDeals(identity);
    const rec = recommendDeal(ranked);

    // Conflicting storage offer is filtered out of valid offers display list
    expect(ranked.bestOffer).toBeNull();
    expect(rec.state).toBe("current_product_is_best_price");
  });

  test('4. Pixel 8a: Refurbished/used offer is not recommended for a new product', () => {
    const amazonCurrent = processProduct({
      title: "Google Pixel 8a (Obsidian, 128GB, 8GB RAM)",
      price: 36999,
      currency: "INR",
      image: "http://example.com/img.jpg",
      url: "https://www.amazon.in/dp/B0D3BD",
      hostname: "www.amazon.in"
    });

    const refurbishedOffer = processProduct({
      title: "Google Pixel 8a (Obsidian, 128GB, 8GB RAM) Refurbished",
      price: 20000,
      currency: "INR",
      image: "http://example.com/img.jpg",
      url: "https://www.vijaysales.com/google-pixel-8a-refurbished",
      hostname: "www.vijaysales.com"
    });

    const clusters = resolveProducts([amazonCurrent, refurbishedOffer]);
    const identity = buildProductIdentities(clusters)[0];
    const ranked = rankDeals(identity);
    const rec = recommendDeal(ranked);

    expect(ranked.bestOffer).toBeNull();
    expect(rec.state).toBe("current_product_is_best_price");
  });

  test('5. Pixel 8a: Missing variant details retained as lower-confidence matching offer but not primary best price', () => {
    const amazonCurrent = processProduct({
      title: "Google Pixel 8a (Obsidian, 128GB, 8GB RAM)",
      price: 36999,
      currency: "INR",
      image: "http://example.com/img.jpg",
      url: "https://www.amazon.in/dp/B0D3BD",
      hostname: "www.amazon.in"
    });

    const missingVariantOffer = processProduct({
      title: "Google Pixel 8a Smartphone",
      price: 28000,
      currency: "INR",
      image: "http://example.com/img.jpg",
      url: "https://www.poorvika.com/google-pixel-8a",
      hostname: "www.poorvika.com"
    });

    const clusters = resolveProducts([amazonCurrent, missingVariantOffer]);
    const identity = buildProductIdentities(clusters)[0];
    const ranked = rankDeals(identity);
    const rec = recommendDeal(ranked);

    expect(ranked.offers.length).toBe(1);
    expect(ranked.offers[0].variantState).toBe("missing_unknown");
    expect(ranked.bestOffer).toBeNull();
    expect(rec.state).toBe("current_product_is_best_price");
  });

  test('6. Current product is genuinely cheapest → "The current product is already the best price."', () => {
    const amazonCurrent = processProduct({
      title: "Google Pixel 8a (Obsidian, 128GB, 8GB RAM)",
      price: 25000,
      currency: "INR",
      image: "http://example.com/img.jpg",
      url: "https://www.amazon.in/dp/B0D3BD",
      hostname: "www.amazon.in"
    });

    const flipkartOffer = processProduct({
      title: "Google Pixel 8a (Obsidian, 128GB, 8GB RAM)",
      price: 27699,
      currency: "INR",
      image: "http://example.com/img.jpg",
      url: "https://www.flipkart.com/google-pixel-8a",
      hostname: "www.flipkart.com"
    });

    const clusters = resolveProducts([amazonCurrent, flipkartOffer]);
    const identity = buildProductIdentities(clusters)[0];
    const ranked = rankDeals(identity);
    const rec = recommendDeal(ranked);

    expect(rec.state).toBe("current_product_is_best_price");
    expect(rec.reason).toBe("The current product is already the best price.");
  });
});
