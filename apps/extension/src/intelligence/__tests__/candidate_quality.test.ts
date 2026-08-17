import { describe, test, expect } from 'vitest';
import { processProduct } from '../engine';
import { calculateCandidateQuality, rankDeals } from '../ranking';
import { resolveProducts, buildProductIdentities } from '../resolver';
import type { ProductIntelligence } from '../types';

describe('Phase 1.10.1 Candidate Quality Signal Test Suite', () => {
  const getProduct = (title: string, overrides: Partial<ProductIntelligence> = {}) => {
    const base = processProduct({
      title,
      price: 49999,
      currency: "INR",
      image: "http://example.com/img.jpg",
      url: "https://www.flipkart.com/item/1",
      hostname: "www.flipkart.com"
    });
    base.metadata.marketplace = "Flipkart";
    return { ...base, ...overrides };
  };

  test('1. Full candidate product with rich metadata evaluates to high quality score', () => {
    const candidate = getProduct("Samsung Galaxy S25 Plus (256GB, 12GB RAM, Black)");
    const quality = calculateCandidateQuality(candidate);

    expect(quality.score).toBeGreaterThanOrEqual(90);
    expect(quality.completeness).toBeGreaterThanOrEqual(85);
    expect(quality.factors.hasBrand).toBe(true);
    expect(quality.factors.hasModel).toBe(true);
    expect(quality.factors.hasPrice).toBe(true);
    expect(quality.factors.hasUrl).toBe(true);
    expect(quality.factors.hasImage).toBe(true);
    expect(quality.factors.hasMarketplace).toBe(true);
    expect(quality.factors.hasVariantSpecs).toBe(true);
  });

  test('2. Candidate missing merchant validity signals (price/URL) yields reduced score', () => {
    const candidate = getProduct("Samsung Galaxy S25 Plus (256GB, 12GB RAM, Black)", {
      originalPrice: null,
      originalUrl: null
    });
    const quality = calculateCandidateQuality(candidate);

    expect(quality.factors.hasPrice).toBe(false);
    expect(quality.factors.hasUrl).toBe(false);
    expect(quality.score).toBeLessThan(80);
    expect(quality.completeness).toBeLessThan(85);
  });

  test('3. Candidate missing core identity (brand/model) yields significantly lower quality score', () => {
    const candidate = getProduct("Generic Item 123", {
      brand: null,
      model: null
    });
    const quality = calculateCandidateQuality(candidate);

    expect(quality.factors.hasBrand).toBe(false);
    expect(quality.factors.hasModel).toBe(false);
    expect(quality.score).toBeLessThan(65);
  });

  test('4. Candidate Quality evaluation is 100% deterministic', () => {
    const candidate = getProduct("Google Pixel 8a (Obsidian, 128GB, 8GB RAM)");
    const q1 = calculateCandidateQuality(candidate);
    const q2 = calculateCandidateQuality(candidate);

    expect(q1.score).toBe(q2.score);
    expect(q1.completeness).toBe(q2.completeness);
    expect(q1.factors).toEqual(q2.factors);
  });

  test('5. rankDeals attaches qualityScore and qualityDetails to RankedOffer', () => {
    const current = getProduct("Samsung Galaxy S25 Plus 256GB");
    const candidate = getProduct("Samsung Galaxy S25 Plus 256GB", {
      originalPrice: 45000,
      originalUrl: "https://www.croma.com/item/2"
    });
    candidate.metadata.marketplace = "Croma";

    const clusters = resolveProducts([current, candidate]);
    const identity = buildProductIdentities(clusters)[0];
    const ranked = rankDeals(identity);

    expect(ranked.offers.length).toBe(1);
    const offer = ranked.offers[0];
    expect(offer.qualityScore).toBeDefined();
    expect(offer.qualityDetails).toBeDefined();
    expect(offer.qualityDetails?.factors.hasBrand).toBe(true);
    expect(offer.qualityDetails?.factors.hasPrice).toBe(true);
  });

  test('6. Null or empty candidate returns 0 quality score safely', () => {
    const quality = calculateCandidateQuality(null as unknown as ProductIntelligence);
    expect(quality.score).toBe(0);
    expect(quality.completeness).toBe(0);
  });
});
