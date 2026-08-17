import { describe, test, expect } from 'vitest';
import { processProduct } from '../engine';
import { calculateIdentityConfidence, rankDeals } from '../ranking';
import { resolveProducts, buildProductIdentities } from '../resolver';
import type { ProductIntelligence } from '../types';

describe('Phase 1.10.2 Identity Confidence Signal Test Suite', () => {
  const getProduct = (title: string, overrides: Partial<ProductIntelligence> = {}) => {
    const base = processProduct({
      title,
      price: 49999,
      currency: "INR",
      image: "http://example.com/img.jpg",
      url: "https://www.amazon.in/dp/" + encodeURIComponent(title),
      hostname: "www.amazon.in"
    });
    base.metadata.marketplace = "Amazon";
    return { ...base, ...overrides };
  };

  const curProduct = getProduct("Samsung Galaxy S25 Plus (Black, 256GB, 12GB RAM)");

  test('1. Exact identity match yields score >= 95 and matchState exact_identity', () => {
    const candidate = getProduct("Samsung Galaxy S25 Plus (Black, 256GB, 12GB RAM)");
    const conf = calculateIdentityConfidence(curProduct, candidate);

    expect(conf.score).toBeGreaterThanOrEqual(95);
    expect(conf.matchState).toBe("exact_identity");
    expect(conf.factors.hasBrandMatch).toBe(true);
    expect(conf.factors.hasModelMatch).toBe(true);
    expect(conf.factors.hasExplicitContradiction).toBe(false);
  });

  test('2. Model match with missing optional variant info yields high_confidence without contradiction', () => {
    const candidate = getProduct("Samsung Galaxy S25 Plus");
    const conf = calculateIdentityConfidence(curProduct, candidate);

    expect(conf.score).toBeGreaterThanOrEqual(80);
    expect(conf.matchState).toBe("high_confidence");
    expect(conf.factors.hasExplicitContradiction).toBe(false);
    expect(conf.factors.missingVariantFields).toContain("storage");
  });

  test('3. Explicit storage contradiction yields score 10 and explicit_contradiction', () => {
    const candidate = getProduct("Samsung Galaxy S25 Plus (Black, 512GB, 12GB RAM)");
    const conf = calculateIdentityConfidence(curProduct, candidate);

    expect(conf.score).toBe(10);
    expect(conf.matchState).toBe("explicit_contradiction");
    expect(conf.factors.hasExplicitContradiction).toBe(true);
    expect(conf.factors.mismatchedFields).toContain("storage");
  });

  test('4. Explicit RAM contradiction yields score 10 and explicit_contradiction', () => {
    const candidate = getProduct("Samsung Galaxy S25 Plus (Black, 256GB, 8GB RAM)");
    const conf = calculateIdentityConfidence(curProduct, candidate);

    expect(conf.score).toBe(10);
    expect(conf.matchState).toBe("explicit_contradiction");
    expect(conf.factors.hasExplicitContradiction).toBe(true);
    expect(conf.factors.mismatchedFields).toContain("ram");
  });

  test('5. Explicit color contradiction yields score 10 and explicit_contradiction', () => {
    const candidate = getProduct("Samsung Galaxy S25 Plus (Blue, 256GB, 12GB RAM)");
    const conf = calculateIdentityConfidence(curProduct, candidate);

    expect(conf.score).toBe(10);
    expect(conf.matchState).toBe("explicit_contradiction");
    expect(conf.factors.hasExplicitContradiction).toBe(true);
    expect(conf.factors.mismatchedFields).toContain("color");
  });

  test('6. Wrong product type / category yields score 0 and explicit_contradiction', () => {
    const candidate = getProduct("Samsung Galaxy Book Laptop");
    const conf = calculateIdentityConfidence(curProduct, candidate);

    expect(conf.score).toBe(0);
    expect(conf.matchState).toBe("explicit_contradiction");
    expect(conf.factors.hasExplicitContradiction).toBe(true);
  });

  test('7. Accessory candidate yields score 0 and isAccessoryOrBundleMismatch', () => {
    const candidate = getProduct("Samsung Galaxy S25 Plus Case");
    const conf = calculateIdentityConfidence(curProduct, candidate);

    expect(conf.score).toBe(0);
    expect(conf.matchState).toBe("explicit_contradiction");
    expect(conf.factors.isAccessoryOrBundleMismatch).toBe(true);
  });

  test('8. Bundle candidate yields score 0 and isAccessoryOrBundleMismatch', () => {
    const candidate = getProduct("Samsung Galaxy S25 Plus + Charger Bundle");
    const conf = calculateIdentityConfidence(curProduct, candidate);

    expect(conf.score).toBe(0);
    expect(conf.matchState).toBe("explicit_contradiction");
    expect(conf.factors.isAccessoryOrBundleMismatch).toBe(true);
  });

  test('9. Normalization-equivalent model names (S25+ vs S25 Plus) score high confidence', () => {
    const candidate = getProduct("Samsung Galaxy S25+ 256GB 12GB Black");
    const conf = calculateIdentityConfidence(curProduct, candidate);

    expect(conf.score).toBeGreaterThanOrEqual(80);
    expect(conf.factors.hasModelMatch).toBe(true);
    expect(conf.factors.hasExplicitContradiction).toBe(false);
  });

  test('10. rankDeals attaches identityConfidenceScore and identityConfidenceDetails to RankedOffer', () => {
    const candidate = getProduct("Samsung Galaxy S25 Plus 256GB 12GB Black", {
      originalUrl: "https://www.croma.com/item/100"
    });
    candidate.metadata.marketplace = "Croma";

    const clusters = resolveProducts([curProduct, candidate]);
    const identity = buildProductIdentities(clusters)[0];
    const ranked = rankDeals(identity);

    expect(ranked.offers.length).toBe(1);
    const offer = ranked.offers[0];
    expect(offer.identityConfidenceScore).toBeDefined();
    expect(offer.identityConfidenceDetails).toBeDefined();
    expect(offer.identityConfidenceDetails?.matchState).toBe("exact_identity");
    expect(offer.identityConfidenceDetails?.factors.hasBrandMatch).toBe(true);
  });

  test('11. Null or invalid products return score 0 safely', () => {
    const conf = calculateIdentityConfidence(null as unknown as ProductIntelligence, null as unknown as ProductIntelligence);
    expect(conf.score).toBe(0);
    expect(conf.matchState).toBe("explicit_contradiction");
  });
});
