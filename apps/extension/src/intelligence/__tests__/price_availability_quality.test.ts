import { describe, test, expect } from 'vitest';
import { processProduct } from '../engine';
import {
  calculatePriceAvailabilityQuality,
  calculateIdentityConfidence,
  calculateMarketplaceReliability,
  rankDeals
} from '../ranking';
import { resolveProducts, buildProductIdentities } from '../resolver';
import type { ProductIntelligence } from '../types';

describe('Phase 1.10.4 Price & Availability Quality Signal Test Suite (Corrected Availability Semantics)', () => {
  const getProduct = (title: string, price: number | null, url: string = "https://www.amazon.in/dp/123", overrides: Partial<ProductIntelligence> = {}) => {
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
    base.metadata.marketplace = "Amazon";
    return { ...base, ...overrides };
  };

  test('1. Valid positive price yields priceScore 100 and priceState valid_price', () => {
    const candidate = getProduct("Samsung Galaxy S25 Plus", 49999);
    const pa = calculatePriceAvailabilityQuality(candidate);

    expect(pa.priceScore).toBe(100);
    expect(pa.priceState).toBe("valid_price");
    expect(pa.factors.hasValidNumericPrice).toBe(true);
  });

  test('2. Missing price yields priceScore 0 and priceState missing_price', () => {
    const candidate = getProduct("Samsung Galaxy S25 Plus", null);
    const pa = calculatePriceAvailabilityQuality(candidate);

    expect(pa.priceScore).toBe(0);
    expect(pa.priceState).toBe("missing_price");
    expect(pa.factors.hasValidNumericPrice).toBe(false);
  });

  test('3. Zero price yields priceScore 0 and priceState invalid_price', () => {
    const candidate = getProduct("Samsung Galaxy S25 Plus", 0);
    const pa = calculatePriceAvailabilityQuality(candidate);

    expect(pa.priceScore).toBe(0);
    expect(pa.priceState).toBe("invalid_price");
  });

  test('4. Negative price yields priceScore 0 and priceState invalid_price', () => {
    const candidate = getProduct("Samsung Galaxy S25 Plus", -500);
    const pa = calculatePriceAvailabilityQuality(candidate);

    expect(pa.priceScore).toBe(0);
    expect(pa.priceState).toBe("invalid_price");
  });

  test('5. Non-numeric / NaN price yields priceScore 0 and priceState invalid_price', () => {
    const candidate = getProduct("Samsung Galaxy S25 Plus", NaN);
    const pa = calculatePriceAvailabilityQuality(candidate);

    expect(pa.priceScore).toBe(0);
    expect(pa.priceState).toBe("invalid_price");
  });

  test('6. Absolute price value does NOT alter quality score (₹50k and ₹45k score identically)', () => {
    const candidateA = getProduct("Samsung Galaxy S25 Plus", 50000);
    const candidateB = getProduct("Samsung Galaxy S25 Plus", 45000);

    const paA = calculatePriceAvailabilityQuality(candidateA);
    const paB = calculatePriceAvailabilityQuality(candidateB);

    expect(paA.priceScore).toBe(100);
    expect(paB.priceScore).toBe(100);
    expect(paA.priceState).toBe("valid_price");
    expect(paB.priceState).toBe("valid_price");
  });

  test('7. Explicit in-stock data yields availabilityScore 100 and in_stock state', () => {
    const candidate = getProduct("Samsung Galaxy S25 Plus (In Stock)", 49999, "https://www.amazon.in/dp/123");
    const pa = calculatePriceAvailabilityQuality(candidate);

    expect(pa.availabilityScore).toBe(100);
    expect(pa.availabilityState).toBe("in_stock");
    expect(pa.factors.isExplicitlyInStock).toBe(true);
    expect(pa.factors.isExplicitlyOutOfStock).toBe(false);
  });

  test('8. Explicit out of stock data yields availabilityScore 0 and out_of_stock state', () => {
    const candidate = getProduct("Samsung Galaxy S25 Plus (Out of Stock)", 49999);
    const pa = calculatePriceAvailabilityQuality(candidate);

    expect(pa.availabilityScore).toBe(0);
    expect(pa.availabilityState).toBe("out_of_stock");
    expect(pa.factors.isExplicitlyOutOfStock).toBe(true);
    expect(pa.factors.isExplicitlyInStock).toBe(false);
  });

  test('9. No availability information + valid price/URL MUST yield unknown_availability (score 50) and MUST NOT become in_stock', () => {
    const candidate = getProduct("Samsung Galaxy S25 Plus 256GB", 49999, "https://www.amazon.in/dp/123");
    const pa = calculatePriceAvailabilityQuality(candidate);

    expect(pa.availabilityScore).toBe(50);
    expect(pa.availabilityState).toBe("unknown_availability");
    expect(pa.factors.isAvailabilityUnknown).toBe(true);
    expect(pa.factors.isExplicitlyInStock).toBe(false);
    expect(pa.factors.isExplicitlyOutOfStock).toBe(false);
    // Overall score = Math.round((100 price + 50 availability) / 2) = 75
    expect(pa.score).toBe(75);
  });

  test('10. Independence: Exact identity + explicit out of stock', () => {
    const curProduct = getProduct("Samsung Galaxy S25 Plus 256GB", 49999);
    const candidate = getProduct("Samsung Galaxy S25 Plus 256GB", 49999, "https://www.amazon.in/dp/200");
    candidate.originalTitle = "Samsung Galaxy S25 Plus 256GB (Out of Stock)";

    const identityConf = calculateIdentityConfidence(curProduct, candidate);
    const priceAvail = calculatePriceAvailabilityQuality(candidate);

    expect(identityConf.score).toBeGreaterThanOrEqual(95);
    expect(priceAvail.availabilityScore).toBe(0);
    expect(priceAvail.availabilityState).toBe("out_of_stock");
  });

  test('11. Independence: Wrong identity + explicit in-stock', () => {
    const curProduct = getProduct("Samsung Galaxy S25 Plus 256GB", 49999);
    const candidate = getProduct("Apple iPhone 16 128GB (In Stock)", 79999, "https://www.amazon.in/dp/300");

    const identityConf = calculateIdentityConfidence(curProduct, candidate);
    const priceAvail = calculatePriceAvailabilityQuality(candidate);

    expect(identityConf.score).toBe(0);
    expect(priceAvail.priceScore).toBe(100);
    expect(priceAvail.availabilityScore).toBe(100);
    expect(priceAvail.availabilityState).toBe("in_stock");
  });

  test('12. Independence: Recognized marketplace + missing price', () => {
    const candidate = getProduct("Samsung Galaxy S25 Plus", null, "https://www.amazon.in/dp/400");
    const mkt = calculateMarketplaceReliability(candidate);
    const pa = calculatePriceAvailabilityQuality(candidate);

    expect(mkt.score).toBe(100);
    expect(pa.priceScore).toBe(0);
    expect(pa.priceState).toBe("missing_price");
  });

  test('13. Independence: Unknown merchant + valid price', () => {
    const candidate = getProduct("Samsung Galaxy S25 Plus", 49999, "https://www.customstore.in/item");
    candidate.metadata.marketplace = "CustomStore";
    const mkt = calculateMarketplaceReliability(candidate);
    const pa = calculatePriceAvailabilityQuality(candidate);

    expect(mkt.score).toBe(75);
    expect(pa.priceScore).toBe(100);
    expect(pa.priceState).toBe("valid_price");
  });

  test('14. rankDeals attaches priceAvailabilityScore and priceAvailabilityDetails to RankedOffer', () => {
    const curProduct = getProduct("Samsung Galaxy S25 Plus 256GB", 49999);
    const candidate = getProduct("Samsung Galaxy S25 Plus 256GB", 45000, "https://www.croma.com/item/1");
    candidate.originalTitle = "Samsung Galaxy S25 Plus 256GB (In Stock)";
    candidate.metadata.marketplace = "Croma";

    const clusters = resolveProducts([curProduct, candidate]);
    const identity = buildProductIdentities(clusters)[0];
    const ranked = rankDeals(identity);

    expect(ranked.offers.length).toBe(1);
    const offer = ranked.offers[0];
    expect(offer.priceAvailabilityScore).toBeDefined();
    expect(offer.priceAvailabilityDetails).toBeDefined();
    expect(offer.priceAvailabilityScore).toBe(100);
    expect(offer.priceAvailabilityDetails?.priceState).toBe("valid_price");
    expect(offer.priceAvailabilityDetails?.availabilityState).toBe("in_stock");
  });

  test('15. Null or invalid candidate returns score 0 safely', () => {
    const pa = calculatePriceAvailabilityQuality(null as unknown as ProductIntelligence);
    expect(pa.score).toBe(0);
    expect(pa.priceState).toBe("missing_price");
  });
});
