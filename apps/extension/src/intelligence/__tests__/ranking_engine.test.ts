import { describe, test, expect } from 'vitest';
import { processProduct } from '../engine';
import {
  rankDeals
} from '../ranking';
import type { ProductIdentity } from '../resolver';
import type { ProductIntelligence } from '../types';

describe('Phase 1.10.6 Ranking Engine Test Suite', () => {
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

  const getRankedResult = (curProduct: ProductIntelligence, candidates: ProductIntelligence[]) => {
    const identity: ProductIdentity = {
      id: curProduct.fingerprint || "test-id",
      representative: curProduct,
      products: [curProduct, ...candidates],
      confidence: 100,
      reason: "Test Identity",
      marketplaces: [curProduct.metadata.marketplace, ...candidates.map(c => c.metadata.marketplace)],
      productCount: candidates.length + 1
    };
    return rankDeals(identity);
  };

  test('1. EXACT IDENTITY: Exact requested product with valid price outranks partial identity with lower price', () => {
    const curProduct = getProduct("Samsung Galaxy S25 256GB", 49999);
    const exactCandidate = getProduct("Samsung Galaxy S25 256GB", 49999, "https://www.amazon.in/dp/1", "Amazon");
    const partialCandidate = getProduct("Samsung Smartphone 256GB", 29999, "https://www.flipkart.com/dp/2", "Flipkart");

    const ranked = getRankedResult(curProduct, [exactCandidate, partialCandidate]);

    // Exact identity candidate MUST rank first despite higher price than partial candidate
    expect(ranked.offers[0].product.originalTitle).toBe(exactCandidate.originalTitle);
    expect(ranked.offers[0].finalRankingScore!).toBeGreaterThan(ranked.offers[1].finalRankingScore!);
  });

  test('2. WRONG PRODUCT: Wrong model with a much lower price MUST NOT outrank exact requested model', () => {
    const curProduct = getProduct("Samsung Galaxy S25 256GB", 49999);
    const exactCandidate = getProduct("Samsung Galaxy S25 256GB", 49999, "https://www.amazon.in/dp/1", "Amazon");
    const wrongModelCandidate = getProduct("Samsung Galaxy S24 256GB", 19999, "https://www.flipkart.com/dp/2", "Flipkart");

    const ranked = getRankedResult(curProduct, [exactCandidate, wrongModelCandidate]);

    expect(ranked.offers[0].product.originalTitle).toBe(exactCandidate.originalTitle);
    expect(ranked.offers[0].finalRankingScore!).toBeGreaterThan(ranked.offers[1].finalRankingScore!);
    expect(ranked.offers[1].rankingDetails?.rankingTier).toBe("contradiction_tier");
  });

  test('3. VARIANT: Requested 256GB vs candidate 512GB MUST NOT outrank exact 256GB candidate', () => {
    const curProduct = getProduct("Samsung Galaxy S25 256GB", 49999);
    const exactCandidate = getProduct("Samsung Galaxy S25 256GB", 49999, "https://www.amazon.in/dp/1", "Amazon");
    const diffVariantCandidate = getProduct("Samsung Galaxy S25 512GB", 39999, "https://www.croma.com/dp/2", "Croma");

    const ranked = getRankedResult(curProduct, [exactCandidate, diffVariantCandidate]);

    expect(ranked.offers[0].product.originalTitle).toBe(exactCandidate.originalTitle);
    expect(ranked.offers[0].finalRankingScore!).toBeGreaterThan(ranked.offers[1].finalRankingScore!);
  });

  test('4. ACCESSORY: Cheap phone case MUST NOT outrank requested phone', () => {
    const curProduct = getProduct("Samsung Galaxy S25 256GB", 49999);
    const exactCandidate = getProduct("Samsung Galaxy S25 256GB", 49999, "https://www.amazon.in/dp/1", "Amazon");
    const caseCandidate = getProduct("Samsung Galaxy S25 Protective Case", 499, "https://www.amazon.in/dp/2", "Amazon");

    const ranked = getRankedResult(curProduct, [exactCandidate, caseCandidate]);

    expect(ranked.offers[0].product.originalTitle).toBe(exactCandidate.originalTitle);
    expect(ranked.offers[0].finalRankingScore!).toBeGreaterThan(ranked.offers[1].finalRankingScore!);
  });

  test('5. BUNDLE: Bundle MUST NOT outrank requested standalone product when identity contradicts', () => {
    const curProduct = getProduct("Samsung Galaxy S25 256GB", 49999);
    const exactCandidate = getProduct("Samsung Galaxy S25 256GB", 49999, "https://www.amazon.in/dp/1", "Amazon");
    const bundleCandidate = getProduct("Samsung Galaxy S25 256GB + 45W Charger Bundle", 29999, "https://www.amazon.in/dp/2", "Amazon");

    const ranked = getRankedResult(curProduct, [exactCandidate, bundleCandidate]);

    expect(ranked.offers[0].product.originalTitle).toBe(exactCandidate.originalTitle);
    expect(ranked.offers[0].finalRankingScore!).toBeGreaterThan(ranked.offers[1].finalRankingScore!);
  });

  test('6. QUALITY: For equally valid identities, a more complete candidate ranks higher', () => {
    const curProduct = getProduct("Samsung Galaxy S25 256GB", 49999);
    const fullCandidate = getProduct("Samsung Galaxy S25 256GB Black", 49999, "https://www.amazon.in/dp/1", "Amazon");
    const sparseCandidate = getProduct("Samsung S25", 49999, "https://www.flipkart.com/dp/2", "Flipkart");
    sparseCandidate.brand = null;
    sparseCandidate.originalImage = null;

    const ranked = getRankedResult(curProduct, [fullCandidate, sparseCandidate]);

    expect(ranked.offers[0].product.originalTitle).toBe(fullCandidate.originalTitle);
    expect(ranked.offers[0].finalRankingScore!).toBeGreaterThan(ranked.offers[1].finalRankingScore!);
  });

  test('7. MARKETPLACE: Marketplace reliability influences ranking only after identity compatibility is established', () => {
    const curProduct = getProduct("Samsung Galaxy S25 256GB", 49999);
    const recognizedOffer = getProduct("Samsung Galaxy S25 256GB", 49999, "https://www.amazon.in/dp/1", "Amazon");
    const unknownMerchantOffer = getProduct("Samsung Galaxy S25 256GB", 49999, "https://www.customstore.in/dp/2", "CustomStore");

    const ranked = getRankedResult(curProduct, [recognizedOffer, unknownMerchantOffer]);

    expect(ranked.offers[0].product.metadata.marketplace).toBe("Amazon");
    expect(ranked.offers[0].finalRankingScore!).toBeGreaterThan(ranked.offers[1].finalRankingScore!);
  });

  test('8. AVAILABILITY: Confirmed available offer outranks an otherwise equivalent explicitly unavailable offer', () => {
    const curProduct = getProduct("Samsung Galaxy S25 256GB", 49999);
    const inStockOffer = getProduct("Samsung Galaxy S25 256GB", 49999, "https://www.amazon.in/dp/1", "Amazon");
    inStockOffer.originalTitle = "Samsung Galaxy S25 256GB (In Stock)";

    const outOfStockOffer = getProduct("Samsung Galaxy S25 256GB", 49999, "https://www.flipkart.com/dp/2", "Flipkart");
    outOfStockOffer.originalTitle = "Samsung Galaxy S25 256GB (Out of Stock)";

    const ranked = getRankedResult(curProduct, [inStockOffer, outOfStockOffer]);

    expect(ranked.offers[0].product.originalTitle).toBe(inStockOffer.originalTitle);
    expect(ranked.offers[0].finalRankingScore!).toBeGreaterThan(ranked.offers[1].finalRankingScore!);
  });

  test('9. UNKNOWN AVAILABILITY: Unknown availability is not treated as confirmed availability', () => {
    const curProduct = getProduct("Samsung Galaxy S25 256GB", 49999);
    const explicitInStock = getProduct("Samsung Galaxy S25 256GB", 49999, "https://www.amazon.in/dp/1", "Amazon");
    explicitInStock.originalTitle = "Samsung Galaxy S25 256GB (In Stock)";

    const unknownAvail = getProduct("Samsung Galaxy S25 256GB", 49999, "https://www.flipkart.com/dp/2", "Flipkart");

    const ranked = getRankedResult(curProduct, [explicitInStock, unknownAvail]);

    expect(ranked.offers[0].product.originalTitle).toBe(explicitInStock.originalTitle);
    expect(ranked.offers[0].finalRankingScore!).toBeGreaterThan(ranked.offers[1].finalRankingScore!);
  });

  test('10. PRICE: For equivalent valid identities, a reasonably lower valid price improves ranking', () => {
    const curProduct = getProduct("Samsung Galaxy S25 256GB", 50000);
    const cheaperOffer = getProduct("Samsung Galaxy S25 256GB", 45000, "https://www.amazon.in/dp/1", "Amazon");
    const pricierOffer = getProduct("Samsung Galaxy S25 256GB", 55000, "https://www.croma.com/dp/2", "Croma");

    const ranked = getRankedResult(curProduct, [cheaperOffer, pricierOffer]);

    expect(ranked.offers[0].product.originalPrice).toBe(45000);
    expect(ranked.offers[0].finalRankingScore!).toBeGreaterThan(ranked.offers[1].finalRankingScore!);
  });

  test('11. PRICE SAFETY: A very cheap wrong-product candidate still ranks below the exact product', () => {
    const curProduct = getProduct("Samsung Galaxy S25 256GB", 49999);
    const exactOffer = getProduct("Samsung Galaxy S25 256GB", 49999, "https://www.amazon.in/dp/1", "Amazon");
    const cheapWrongOffer = getProduct("Samsung Galaxy S20 64GB", 5000, "https://www.cheapshop.com/dp/2", "CheapShop");

    const ranked = getRankedResult(curProduct, [exactOffer, cheapWrongOffer]);

    expect(ranked.offers[0].product.originalTitle).toBe(exactOffer.originalTitle);
    expect(ranked.offers[0].finalRankingScore!).toBeGreaterThan(ranked.offers[1].finalRankingScore!);
  });

  test('12. DUPLICATES: Multiple merchants offering the same product remain separate candidates in offers[]', () => {
    const curProduct = getProduct("Samsung Galaxy S25 256GB", 49999);
    const amazonOffer = getProduct("Samsung Galaxy S25 256GB", 49999, "https://www.amazon.in/dp/1", "Amazon");
    const flipkartOffer = getProduct("Samsung Galaxy S25 256GB", 48999, "https://www.flipkart.com/dp/2", "Flipkart");

    const ranked = getRankedResult(curProduct, [amazonOffer, flipkartOffer]);

    expect(ranked.offers.length).toBe(2);
  });

  test('13. DUPLICATE PENALTY: Duplicate/redundant candidates do NOT receive a ranking bonus from duplicate score', () => {
    const curProduct = getProduct("Samsung Galaxy S25 256GB", 49999);
    const primaryOffer = getProduct("Samsung Galaxy S25 256GB", 49999, "https://www.amazon.in/dp/1", "Amazon");
    const redundantDuplicate = getProduct("Samsung Galaxy S25 256GB", 49999, "https://www.amazon.in/dp/1", "Amazon");

    const ranked = getRankedResult(curProduct, [primaryOffer, redundantDuplicate]);

    expect(ranked.offers[0].rankingDetails?.duplicatePenalty).toBe(0);
    if (ranked.offers.length > 1) {
      expect(ranked.offers[1].rankingDetails?.duplicatePenalty).toBeGreaterThan(0);
    }
  });

  test('14. NORMALIZATION: S25+ and S25 Plus rank as the same canonical model identity', () => {
    const curProduct = getProduct("Samsung Galaxy S25+ 256 GB", 54999);
    const normOffer = getProduct("Samsung Galaxy S25 Plus 256GB", 54999, "https://www.croma.com/dp/1", "Croma");

    const ranked = getRankedResult(curProduct, [normOffer]);

    expect(ranked.offers.length).toBe(1);
    expect(ranked.offers[0].rankingDetails?.rankingTier).toBe("exact_identity_tier");
  });

  test('15. DETERMINISM: Same input candidates produce exactly the same ranking and scores across repeated executions', () => {
    const curProduct = getProduct("Samsung Galaxy S25 256GB", 49999);
    const cand1 = getProduct("Samsung Galaxy S25 256GB", 48999, "https://www.amazon.in/dp/1", "Amazon");
    const cand2 = getProduct("Samsung Galaxy S25 256GB", 47999, "https://www.flipkart.com/dp/2", "Flipkart");

    const ranked1 = getRankedResult(curProduct, [cand1, cand2]);
    const ranked2 = getRankedResult(curProduct, [cand1, cand2]);

    expect(ranked1.offers.length).toBe(ranked2.offers.length);
    for (let i = 0; i < ranked1.offers.length; i++) {
      expect(ranked1.offers[i].finalRankingScore).toBe(ranked2.offers[i].finalRankingScore);
      expect(ranked1.offers[i].product.originalUrl).toBe(ranked2.offers[i].product.originalUrl);
    }
  });

  test('16. BREAKDOWN EXPLAINABILITY: rankingDetails exposes all factor contributions and tier', () => {
    const curProduct = getProduct("Samsung Galaxy S25 256GB", 49999);
    const cand = getProduct("Samsung Galaxy S25 256GB", 48999, "https://www.amazon.in/dp/1", "Amazon");

    const ranked = getRankedResult(curProduct, [cand]);

    const details = ranked.offers[0].rankingDetails;
    expect(details).toBeDefined();
    expect(details?.finalScore).toBeDefined();
    expect(details?.rankingTier).toBeDefined();
    expect(details?.contributions.identityContribution).toBeDefined();
    expect(details?.contributions.qualityContribution).toBeDefined();
    expect(details?.contributions.priceAvailabilityContribution).toBeDefined();
    expect(details?.contributions.priceCompetitivenessContribution).toBeDefined();
    expect(details?.contributions.marketplaceContribution).toBeDefined();
    expect(details?.contributions.duplicatePenalty).toBeDefined();
    expect(details?.explanation).toBeDefined();
  });

  test('17. INPUT ORDER INDEPENDENCE: Same candidates in REVERSED input order produce identical primary candidate, penalties, scores, and order', () => {
    const curProduct = getProduct("Samsung Galaxy S25 256GB", 49999);
    const candA = getProduct("Samsung Galaxy S25 256GB", 49999, "https://www.amazon.in/dp/AAA", "Amazon");
    const candB = getProduct("Samsung Galaxy S25 256GB", 45000, "https://www.amazon.in/dp/BBB", "Amazon");

    // Order 1: [candA, candB]
    const rankedForward = getRankedResult(curProduct, [candA, candB]);

    // Order 2: [candB, candA] (Reversed input order)
    const rankedReversed = getRankedResult(curProduct, [candB, candA]);

    expect(rankedForward.offers.length).toBe(2);
    expect(rankedReversed.offers.length).toBe(2);

    // Primary representative selected deterministically (candB due to lower price ₹45,000)
    expect(rankedForward.offers[0].product.originalUrl).toBe(candB.originalUrl);
    expect(rankedReversed.offers[0].product.originalUrl).toBe(candB.originalUrl);

    expect(rankedForward.offers[0].finalRankingScore).toBe(rankedReversed.offers[0].finalRankingScore);
    expect(rankedForward.offers[1].finalRankingScore).toBe(rankedReversed.offers[1].finalRankingScore);

    expect(rankedForward.offers[0].rankingDetails?.duplicatePenalty).toBe(rankedReversed.offers[0].rankingDetails?.duplicatePenalty);
    expect(rankedForward.offers[1].rankingDetails?.duplicatePenalty).toBe(rankedReversed.offers[1].rankingDetails?.duplicatePenalty);
  });
});
