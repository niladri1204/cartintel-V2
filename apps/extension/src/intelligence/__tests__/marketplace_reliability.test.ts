import { describe, test, expect } from 'vitest';
import { processProduct } from '../engine';
import { calculateMarketplaceReliability, calculateIdentityConfidence, rankDeals } from '../ranking';
import { resolveProducts, buildProductIdentities } from '../resolver';
import type { ProductIntelligence } from '../types';

describe('Phase 1.10.3 Marketplace Reliability Signal Test Suite', () => {
  const getProduct = (title: string, marketplace: string, url: string, overrides: Partial<ProductIntelligence> = {}) => {
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
      price: 49999,
      currency: "INR",
      image: "http://example.com/img.jpg",
      url,
      hostname
    });
    base.metadata.marketplace = marketplace;
    return { ...base, ...overrides };
  };

  test('1. Recognized major platform (Amazon) yields score 100 and recognized_marketplace', () => {
    const candidate = getProduct("Samsung Galaxy S25 Plus", "Amazon", "https://www.amazon.in/dp/B012345");
    const rel = calculateMarketplaceReliability(candidate);

    expect(rel.score).toBe(100);
    expect(rel.reliabilityState).toBe("recognized_marketplace");
    expect(rel.factors.isRecognizedPlatform).toBe(true);
    expect(rel.factors.hasValidDomain).toBe(true);
    expect(rel.marketplaceName).toBe("Amazon");
  });

  test('2. Recognized marketplace derived from domain when metadata.marketplace is unpopulated', () => {
    const candidate = getProduct("Samsung Galaxy S25 Plus", "", "https://www.croma.com/p/123456");
    const rel = calculateMarketplaceReliability(candidate);

    expect(rel.score).toBe(100);
    expect(rel.reliabilityState).toBe("recognized_marketplace");
    expect(rel.factors.isRecognizedPlatform).toBe(true);
    expect(rel.marketplaceName).toBe("Croma");
  });

  test('3. Identified custom merchant domain yields score 75 and identified_merchant', () => {
    const candidate = getProduct("Samsung Galaxy S25 Plus", "CustomStore", "https://www.customelectronics.in/p/999");
    const rel = calculateMarketplaceReliability(candidate);

    expect(rel.score).toBe(75);
    expect(rel.reliabilityState).toBe("identified_merchant");
    expect(rel.factors.isRecognizedPlatform).toBe(false);
    expect(rel.factors.hasValidDomain).toBe(true);
    expect(rel.marketplaceName).toBe("Customelectronics");
  });

  test('4. Unusable / Unknown marketplace info yields score 0 and unusable_marketplace', () => {
    const candidate = getProduct("Samsung Galaxy S25 Plus", "Unknown seller/site", "");
    candidate.originalUrl = null;
    candidate.metadata.hostname = "";
    const rel = calculateMarketplaceReliability(candidate);

    expect(rel.score).toBe(0);
    expect(rel.reliabilityState).toBe("unusable_marketplace");
    expect(rel.factors.isUnusableSource).toBe(true);
  });

  test('5. Marketplace Reliability is completely independent of Identity Confidence', () => {
    const curProduct = getProduct("Samsung Galaxy S25 Plus 256GB", "Amazon", "https://www.amazon.in/dp/B1");

    const exactMatchCandidate = getProduct("Samsung Galaxy S25 Plus 256GB", "Amazon", "https://www.amazon.in/dp/B2");
    const weakMatchCandidate = getProduct("Apple iPhone 16 128GB", "Amazon", "https://www.amazon.in/dp/B3");

    const exactIdentity = calculateIdentityConfidence(curProduct, exactMatchCandidate);
    const weakIdentity = calculateIdentityConfidence(curProduct, weakMatchCandidate);

    const exactMarketplace = calculateMarketplaceReliability(exactMatchCandidate);
    const weakMarketplace = calculateMarketplaceReliability(weakMatchCandidate);

    // Identity confidence differs drastically (100 vs 0)
    expect(exactIdentity.score).toBeGreaterThanOrEqual(95);
    expect(weakIdentity.score).toBe(0);

    // Marketplace reliability remains IDENTICAL (100 for both since both are Amazon)
    expect(exactMarketplace.score).toBe(100);
    expect(weakMarketplace.score).toBe(100);
    expect(exactMarketplace.reliabilityState).toBe("recognized_marketplace");
    expect(weakMarketplace.reliabilityState).toBe("recognized_marketplace");
  });

  test('6. rankDeals attaches marketplaceReliabilityScore and marketplaceReliabilityDetails to RankedOffer', () => {
    const curProduct = getProduct("Samsung Galaxy S25 Plus 256GB", "Amazon", "https://www.amazon.in/dp/B1");
    const candidate = getProduct("Samsung Galaxy S25 Plus 256GB", "Croma", "https://www.croma.com/p/200");

    const clusters = resolveProducts([curProduct, candidate]);
    const identity = buildProductIdentities(clusters)[0];
    const ranked = rankDeals(identity);

    expect(ranked.offers.length).toBe(1);
    const offer = ranked.offers[0];
    expect(offer.marketplaceReliabilityScore).toBeDefined();
    expect(offer.marketplaceReliabilityDetails).toBeDefined();
    expect(offer.marketplaceReliabilityScore).toBe(100);
    expect(offer.marketplaceReliabilityDetails?.marketplaceName).toBe("Croma");
  });

  test('7. Null or invalid candidate returns score 0 safely', () => {
    const rel = calculateMarketplaceReliability(null as unknown as ProductIntelligence);
    expect(rel.score).toBe(0);
    expect(rel.reliabilityState).toBe("unusable_marketplace");
  });
});
