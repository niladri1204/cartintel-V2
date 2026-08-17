import { describe, test, expect } from 'vitest';
import { processProduct } from '../engine';
import {
  calculateDuplicateRedundancy,
  calculateMarketplaceReliability,
  calculatePriceAvailabilityQuality,
  rankDeals
} from '../ranking';
import { resolveProducts, buildProductIdentities } from '../resolver';
import type { ProductIntelligence } from '../types';

describe('Phase 1.10.5 Duplicate / Redundancy Signal Test Suite', () => {
  const getProduct = (
    title: string,
    price: number | null = 49999,
    url: string = "https://www.amazon.in/dp/123",
    marketplace: string = "Amazon",
    overrides: Partial<ProductIntelligence> = {}
  ) => {
    let hostname = "";
    if (url) {
      try {
        hostname = new URL(url).hostname;
      } catch {
        hostname = "";
      }
    }
    const base = processProduct({
      title,
      price,
      currency: "INR",
      image: "http://example.com/img.jpg",
      url,
      hostname
    });
    base.metadata.marketplace = marketplace;
    return { ...base, ...overrides };
  };

  test('1. Same phone model + same variant from different merchants yields same_identity_duplicate and score 100', () => {
    const curProduct = getProduct("Samsung Galaxy S25 256GB Black", 49999, "https://www.amazon.in/dp/123", "Amazon");
    const candidate = getProduct("Samsung Galaxy S25 256 GB Black", 48999, "https://www.flipkart.com/item/1", "Flipkart");

    const dup = calculateDuplicateRedundancy(curProduct, candidate);

    expect(dup.duplicateState).toBe("same_identity_duplicate");
    expect(dup.score).toBeGreaterThanOrEqual(95);
    expect(dup.factors.isMultiMerchantDuplicate).toBe(true);
    expect(dup.factors.hasHardIdentityMismatch).toBe(false);
    expect(dup.factors.hasVariantContradiction).toBe(false);
  });

  test('2. Formatting differences in storage/model (S25+ 256 GB vs S25 Plus 256GB) resolve to same_identity_duplicate', () => {
    const curProduct = getProduct("Samsung Galaxy S25+ 256 GB", 54999);
    const candidate = getProduct("Samsung Galaxy S25 Plus 256GB", 53999, "https://www.croma.com/p/1", "Croma");

    const dup = calculateDuplicateRedundancy(curProduct, candidate);

    expect(dup.duplicateState).toBe("same_identity_duplicate");
    expect(dup.score).toBeGreaterThanOrEqual(80);
  });

  test('3. Different storage (128GB vs 256GB) yields distinct_identity and score 0', () => {
    const curProduct = getProduct("Samsung Galaxy S25 128GB", 49999);
    const candidate = getProduct("Samsung Galaxy S25 256GB", 54999);

    const dup = calculateDuplicateRedundancy(curProduct, candidate);

    expect(dup.duplicateState).toBe("distinct_identity");
    expect(dup.score).toBe(0);
    expect(dup.factors.hasVariantContradiction).toBe(true);
    expect(dup.distinguishingFields).toContain("storage");
  });

  test('4. Different models (S25 vs S25 Plus) yields distinct_identity and score 0', () => {
    const curProduct = getProduct("Samsung Galaxy S25 256GB", 49999);
    const candidate = getProduct("Samsung Galaxy S25 Plus 256GB", 59999);

    const dup = calculateDuplicateRedundancy(curProduct, candidate);

    expect(dup.duplicateState).toBe("distinct_identity");
    expect(dup.score).toBe(0);
    expect(dup.factors.hasHardIdentityMismatch).toBe(true);
    expect(dup.distinguishingFields).toContain("model");
  });

  test('5. Different colors (Black vs Blue) yields distinct_identity and score 0', () => {
    const curProduct = getProduct("Samsung Galaxy S25 256GB Black", 49999);
    const candidate = getProduct("Samsung Galaxy S25 256GB Blue", 49999);

    const dup = calculateDuplicateRedundancy(curProduct, candidate);

    expect(dup.duplicateState).toBe("distinct_identity");
    expect(dup.score).toBe(0);
    expect(dup.factors.hasVariantContradiction).toBe(true);
    expect(dup.distinguishingFields).toContain("color");
  });

  test('6. Phone vs Accessory (S25 vs S25 Case) yields distinct_identity and score 0', () => {
    const curProduct = getProduct("Samsung Galaxy S25 256GB", 49999);
    const candidate = getProduct("Samsung Galaxy S25 Protective Case", 999);

    const dup = calculateDuplicateRedundancy(curProduct, candidate);

    expect(dup.duplicateState).toBe("distinct_identity");
    expect(dup.score).toBe(0);
    expect(dup.factors.hasHardIdentityMismatch).toBe(true);
  });

  test('7. Product vs Bundle (S25 vs S25 + Charger Bundle) yields distinct_identity and score 0', () => {
    const curProduct = getProduct("Samsung Galaxy S25 256GB", 49999);
    const candidate = getProduct("Samsung Galaxy S25 256GB + 45W Charger Bundle", 52999);

    const dup = calculateDuplicateRedundancy(curProduct, candidate);

    expect(dup.duplicateState).toBe("distinct_identity");
    expect(dup.score).toBe(0);
    expect(dup.factors.hasHardIdentityMismatch).toBe(true);
  });

  test('8. Insufficient identity information (missing brand/model) yields insufficient_identity_data and score 30', () => {
    const curProduct = getProduct("Samsung Galaxy S25 256GB", 49999);
    const candidate = getProduct("Wireless Smartphone Black 256GB", 29999);
    candidate.brand = null;
    candidate.model = null;

    const dup = calculateDuplicateRedundancy(curProduct, candidate);

    expect(dup.duplicateState).toBe("insufficient_identity_data");
    expect(dup.score).toBe(30);
  });

  test('9. Independence: Same identity but different marketplace', () => {
    const curProduct = getProduct("Samsung Galaxy S25 256GB", 49999, "https://www.amazon.in/dp/123", "Amazon");
    const candidate = getProduct("Samsung Galaxy S25 256GB", 49999, "https://www.customshop.in/p/1", "CustomShop");

    const dup = calculateDuplicateRedundancy(curProduct, candidate);
    const mkt = calculateMarketplaceReliability(candidate);

    expect(dup.score).toBeGreaterThanOrEqual(95);
    expect(mkt.score).toBe(75); // CustomShop identified merchant
  });

  test('10. Independence: Same identity but different price', () => {
    const curProduct = getProduct("Samsung Galaxy S25 256GB", 50000);
    const candidate = getProduct("Samsung Galaxy S25 256GB", 42000, "https://www.croma.com/p/1", "Croma");

    const dup = calculateDuplicateRedundancy(curProduct, candidate);
    const pa = calculatePriceAvailabilityQuality(candidate);

    expect(dup.score).toBeGreaterThanOrEqual(95);
    expect(pa.priceScore).toBe(100);
  });

  test('11. Independence: Same identity but different URL', () => {
    const curProduct = getProduct("Samsung Galaxy S25 256GB", 49999, "https://www.amazon.in/dp/AAA");
    const candidate = getProduct("Samsung Galaxy S25 256GB", 49999, "https://www.amazon.in/dp/BBB");

    const dup = calculateDuplicateRedundancy(curProduct, candidate);

    expect(dup.score).toBeGreaterThanOrEqual(95);
    expect(dup.duplicateState).toBe("same_identity_duplicate");
  });

  test('12. Independence: Different identity with similar title tokens', () => {
    const curProduct = getProduct("Samsung Galaxy S25 Ultra 256GB", 109999);
    const candidate = getProduct("Samsung Galaxy S25 256GB", 49999);

    const dup = calculateDuplicateRedundancy(curProduct, candidate);

    expect(dup.score).toBe(0);
    expect(dup.duplicateState).toBe("distinct_identity");
  });

  test('13. rankDeals attaches duplicateRedundancyDetails without deleting or filtering candidate offers', () => {
    const curProduct = getProduct("Samsung Galaxy S25 256GB", 49999);
    const cand1 = getProduct("Samsung Galaxy S25 256GB", 48000, "https://www.croma.com/p/1", "Croma");
    const cand2 = getProduct("Samsung Galaxy S25 256GB", 47000, "https://www.flipkart.com/p/1", "Flipkart");

    const clusters = resolveProducts([curProduct, cand1, cand2]);
    const identity = buildProductIdentities(clusters)[0];
    const ranked = rankDeals(identity);

    // Candidates MUST NOT be deleted or filtered out!
    expect(ranked.offers.length).toBe(2);
    expect(ranked.offers[0].duplicateRedundancyScore).toBeDefined();
    expect(ranked.offers[0].duplicateRedundancyDetails).toBeDefined();
    expect(ranked.offers[0].duplicateRedundancyDetails?.duplicateState).toBe("same_identity_duplicate");
    expect(ranked.offers[1].duplicateRedundancyDetails?.duplicateState).toBe("same_identity_duplicate");
  });

  test('14. Null or invalid candidate returns score 0 safely', () => {
    const dup = calculateDuplicateRedundancy(null as unknown as ProductIntelligence, null as unknown as ProductIntelligence);
    expect(dup.score).toBe(0);
    expect(dup.duplicateState).toBe("insufficient_identity_data");
  });
});
