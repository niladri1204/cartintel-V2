import { describe, test, expect } from 'vitest';
import { processProduct } from '../engine';
import {
  selectBestListing,
  rankDeals
} from '../ranking';
import type { ProductIdentity } from '../resolver';
import type { ProductIntelligence } from '../types';

describe('Phase 1.10.7 Best Listing Selection Test Suite', () => {
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

  test('1. Exact available product beats partial cheaper product', () => {
    const curProduct = getProduct("Samsung Galaxy S25 256GB", 49999);
    const exactCandidate = getProduct("Samsung Galaxy S25 256GB", 49999, "https://www.amazon.in/dp/1", "Amazon");
    exactCandidate.originalTitle = "Samsung Galaxy S25 256GB (In Stock)";
    const partialCandidate = getProduct("Samsung Smartphone 256GB", 29999, "https://www.flipkart.com/dp/2", "Flipkart");

    const ranked = getRankedResult(curProduct, [exactCandidate, partialCandidate]);

    expect(ranked.bestOffer).toBeDefined();
    expect(ranked.bestOffer?.product.originalTitle).toBe("Samsung Galaxy S25 256GB (In Stock)");
    expect(ranked.bestListingDetails?.selectionTier).toBe("exact_available");
  });

  test('2. Exact product beats wrong model even when wrong model is much cheaper', () => {
    const curProduct = getProduct("Samsung Galaxy S25 256GB", 49999);
    const exactCandidate = getProduct("Samsung Galaxy S25 256GB", 49999, "https://www.amazon.in/dp/1", "Amazon");
    const wrongModelCandidate = getProduct("Samsung Galaxy S24 256GB", 14999, "https://www.cheapshop.com/dp/2", "CheapShop");

    const ranked = getRankedResult(curProduct, [exactCandidate, wrongModelCandidate]);

    expect(ranked.bestOffer).toBeDefined();
    expect(ranked.bestOffer?.product.originalTitle).toBe(exactCandidate.originalTitle);
    expect(ranked.bestOffer?.product.model).toBe("galaxy s25");
  });

  test('3. Exact 256GB beats contradictory 512GB candidate', () => {
    const curProduct = getProduct("Samsung Galaxy S25 256GB", 49999);
    const exactCandidate = getProduct("Samsung Galaxy S25 256GB", 49999, "https://www.amazon.in/dp/1", "Amazon");
    const diffVariantCandidate = getProduct("Samsung Galaxy S25 512GB", 34999, "https://www.croma.com/dp/2", "Croma");

    const ranked = getRankedResult(curProduct, [exactCandidate, diffVariantCandidate]);

    expect(ranked.bestOffer).toBeDefined();
    expect(ranked.bestOffer?.product.originalTitle).toBe(exactCandidate.originalTitle);
    expect(ranked.bestOffer?.product.storage?.toLowerCase()).toBe("256gb");
  });

  test('4. Phone beats cheap phone-case candidate', () => {
    const curProduct = getProduct("Samsung Galaxy S25 256GB", 49999);
    const phoneCandidate = getProduct("Samsung Galaxy S25 256GB", 49999, "https://www.amazon.in/dp/1", "Amazon");
    const caseCandidate = getProduct("Samsung Galaxy S25 Protective Case", 499, "https://www.amazon.in/dp/2", "Amazon");

    const ranked = getRankedResult(curProduct, [phoneCandidate, caseCandidate]);

    expect(ranked.bestOffer).toBeDefined();
    expect(ranked.bestOffer?.product.originalTitle).toBe(phoneCandidate.originalTitle);
  });

  test('5. Phone beats bundle/accessory mismatch', () => {
    const curProduct = getProduct("Samsung Galaxy S25 256GB", 49999);
    const phoneCandidate = getProduct("Samsung Galaxy S25 256GB", 49999, "https://www.amazon.in/dp/1", "Amazon");
    const bundleCandidate = getProduct("Samsung Galaxy S25 256GB + 45W Charger Bundle", 29999, "https://www.amazon.in/dp/2", "Amazon");

    const ranked = getRankedResult(curProduct, [phoneCandidate, bundleCandidate]);

    expect(ranked.bestOffer).toBeDefined();
    expect(ranked.bestOffer?.product.originalTitle).toBe(phoneCandidate.originalTitle);
  });

  test('6. Exact available offer beats exact out-of-stock offer when otherwise comparable', () => {
    const curProduct = getProduct("Samsung Galaxy S25 256GB", 49999);
    const inStockOffer = getProduct("Samsung Galaxy S25 256GB", 49999, "https://www.amazon.in/dp/1", "Amazon");
    inStockOffer.originalTitle = "Samsung Galaxy S25 256GB (In Stock)";

    const outOfStockOffer = getProduct("Samsung Galaxy S25 256GB", 45000, "https://www.flipkart.com/dp/2", "Flipkart");
    outOfStockOffer.originalTitle = "Samsung Galaxy S25 256GB (Out of Stock)";

    const ranked = getRankedResult(curProduct, [inStockOffer, outOfStockOffer]);

    expect(ranked.bestOffer).toBeDefined();
    expect(ranked.bestOffer?.product.originalTitle).toBe(inStockOffer.originalTitle);
    expect(ranked.bestListingDetails?.selectionTier).toBe("exact_available");
  });

  test('7. Exact unknown-availability offer can still be selected when no confirmed-available exact offer exists', () => {
    const curProduct = getProduct("Samsung Galaxy S25 256GB", 49999);
    const unknownAvailOffer = getProduct("Samsung Galaxy S25 256GB", 49999, "https://www.amazon.in/dp/1", "Amazon");
    const outOfStockOffer = getProduct("Samsung Galaxy S25 256GB", 45000, "https://www.flipkart.com/dp/2", "Flipkart");
    outOfStockOffer.originalTitle = "Samsung Galaxy S25 256GB (Out of Stock)";

    const ranked = getRankedResult(curProduct, [unknownAvailOffer, outOfStockOffer]);

    expect(ranked.bestOffer).toBeDefined();
    expect(ranked.bestOffer?.product.originalTitle).toBe(unknownAvailOffer.originalTitle);
    expect(ranked.bestListingDetails?.selectionTier).toBe("exact_unknown_availability");
  });

  test('8. Valid-priced compatible offer beats otherwise equivalent missing-price offer', () => {
    const curProduct = getProduct("Samsung Galaxy S25 256GB", 49999);
    const validPriceOffer = getProduct("Samsung Galaxy S25 256GB", 49999, "https://www.amazon.in/dp/1", "Amazon");
    const missingPriceOffer = getProduct("Samsung Galaxy S25 256GB", null, "https://www.flipkart.com/dp/2", "Flipkart");

    const ranked = getRankedResult(curProduct, [validPriceOffer, missingPriceOffer]);

    expect(ranked.bestOffer).toBeDefined();
    expect(ranked.bestOffer?.product.originalTitle).toBe(validPriceOffer.originalTitle);
    expect(ranked.bestOffer?.product.originalPrice).toBe(49999);
  });

  test('9. Recognized marketplace does not override product identity', () => {
    const curProduct = getProduct("Samsung Galaxy S25 256GB", 49999);
    const customStoreExact = getProduct("Samsung Galaxy S25 256GB", 49999, "https://www.customstore.in/dp/1", "CustomStore");
    const amazonWrongModel = getProduct("Samsung Galaxy S24 256GB", 19999, "https://www.amazon.in/dp/2", "Amazon");

    const ranked = getRankedResult(curProduct, [customStoreExact, amazonWrongModel]);

    expect(ranked.bestOffer).toBeDefined();
    expect(ranked.bestOffer?.product.metadata.marketplace).toBe("CustomStore");
  });

  test('10. Lower price does not override identity contradiction', () => {
    const curProduct = getProduct("Samsung Galaxy S25 256GB", 49999);
    const exactOffer = getProduct("Samsung Galaxy S25 256GB", 49999, "https://www.amazon.in/dp/1", "Amazon");
    const superCheapWrong = getProduct("Samsung Galaxy S10 64GB", 1000, "https://www.cheapshop.com/dp/2", "CheapShop");

    const ranked = getRankedResult(curProduct, [exactOffer, superCheapWrong]);

    expect(ranked.bestOffer).toBeDefined();
    expect(ranked.bestOffer?.product.originalTitle).toBe(exactOffer.originalTitle);
  });

  test('11. Same product across multiple merchants: all offers remain in ranked results, exactly one is selected as Best Listing', () => {
    const curProduct = getProduct("Samsung Galaxy S25 256GB", 49999);
    const amazonOffer = getProduct("Samsung Galaxy S25 256GB", 49999, "https://www.amazon.in/dp/1", "Amazon");
    const flipkartOffer = getProduct("Samsung Galaxy S25 256GB", 48999, "https://www.flipkart.com/dp/2", "Flipkart");

    const ranked = getRankedResult(curProduct, [amazonOffer, flipkartOffer]);

    // All offers MUST remain in offers[]
    expect(ranked.offers.length).toBe(2);
    // Exactly one offer is selected as bestOffer
    expect(ranked.bestOffer).toBeDefined();
    expect(ranked.bestOffer?.product.originalUrl).toBe(flipkartOffer.originalUrl);
  });

  test('12. Duplicate representative selection remains deterministic', () => {
    const curProduct = getProduct("Samsung Galaxy S25 256GB", 49999);
    const dup1 = getProduct("Samsung Galaxy S25 256GB", 49999, "https://www.amazon.in/dp/AAA", "Amazon");
    const dup2 = getProduct("Samsung Galaxy S25 256GB", 45000, "https://www.amazon.in/dp/BBB", "Amazon");

    const ranked = getRankedResult(curProduct, [dup1, dup2]);

    expect(ranked.bestOffer).toBeDefined();
    expect(ranked.bestOffer?.product.originalUrl).toBe(dup2.originalUrl);
  });

  test('13. Input order reversal produces the exact same selected listing', () => {
    const curProduct = getProduct("Samsung Galaxy S25 256GB", 49999);
    const candA = getProduct("Samsung Galaxy S25 256GB", 49999, "https://www.amazon.in/dp/AAA", "Amazon");
    const candB = getProduct("Samsung Galaxy S25 256GB", 45000, "https://www.amazon.in/dp/BBB", "Amazon");

    const rankedForward = getRankedResult(curProduct, [candA, candB]);
    const rankedReversed = getRankedResult(curProduct, [candB, candA]);

    expect(rankedForward.bestOffer?.product.originalUrl).toBe(rankedReversed.bestOffer?.product.originalUrl);
    expect(rankedForward.bestListingDetails?.selectionTier).toBe(rankedReversed.bestListingDetails?.selectionTier);
  });

  test('14. All candidates contradictory yields bestOffer null and no_actionable_offer tier', () => {
    const curProduct = getProduct("Samsung Galaxy S25 256GB", 49999);
    const wrongModel = getProduct("Samsung Galaxy S24 256GB", 19999, "https://www.cheap.com/1", "Cheap");
    const caseCand = getProduct("Samsung Galaxy S25 Case", 499, "https://www.cheap.com/2", "Cheap");

    const ranked = getRankedResult(curProduct, [wrongModel, caseCand]);

    expect(ranked.bestOffer).toBeNull();
    expect(ranked.bestListingDetails?.selectionTier).toBe("no_actionable_offer");
    expect(ranked.bestListingDetails?.consideredOfferCount).toBe(2);
  });

  test('15. Selection result explains why winner was chosen', () => {
    const curProduct = getProduct("Samsung Galaxy S25 256GB", 49999);
    const cand = getProduct("Samsung Galaxy S25 256GB", 48999, "https://www.amazon.in/dp/1", "Amazon");
    cand.originalTitle = "Samsung Galaxy S25 256GB (In Stock)";

    const ranked = getRankedResult(curProduct, [cand]);

    expect(ranked.bestListingDetails?.selectionReason).toBeDefined();
    expect(ranked.bestListingDetails?.selectionReason.length).toBeGreaterThan(10);
  });

  test('16. Existing ranking score remains unchanged by selection', () => {
    const curProduct = getProduct("Samsung Galaxy S25 256GB", 49999);
    const cand1 = getProduct("Samsung Galaxy S25 256GB", 48999, "https://www.amazon.in/dp/1", "Amazon");
    const cand2 = getProduct("Samsung Galaxy S25 256GB", 47999, "https://www.flipkart.com/dp/2", "Flipkart");

    const ranked = getRankedResult(curProduct, [cand1, cand2]);

    const score1 = ranked.offers[0].finalRankingScore;
    const score2 = ranked.offers[1].finalRankingScore;

    selectBestListing(curProduct, ranked.offers);

    expect(ranked.offers[0].finalRankingScore).toBe(score1);
    expect(ranked.offers[1].finalRankingScore).toBe(score2);
  });

  test('17. DIRECT FUNCTION DETERMINISM: selectBestListing() returns identical results for original, reversed, and shuffled offers', () => {
    const curProduct = getProduct("Samsung Galaxy S25 256GB", 49999);
    const candA = getProduct("Samsung Galaxy S25 256GB", 49999, "https://www.amazon.in/dp/AAA", "Amazon");
    const candB = getProduct("Samsung Galaxy S25 256GB", 45000, "https://www.amazon.in/dp/BBB", "Amazon");
    const candC = getProduct("Samsung Galaxy S25 256GB", 47000, "https://www.croma.com/dp/CCC", "Croma");

    const ranked = getRankedResult(curProduct, [candA, candB, candC]);
    const offersOriginal = [...ranked.offers];
    const offersReversed = [...ranked.offers].reverse();
    const offersShuffled = [ranked.offers[1], ranked.offers[2], ranked.offers[0]];

    const selOriginal = selectBestListing(curProduct, offersOriginal);
    const selReversed = selectBestListing(curProduct, offersReversed);
    const selShuffled = selectBestListing(curProduct, offersShuffled);

    expect(selOriginal.selectedOffer?.product.originalUrl).toBe(candB.originalUrl);
    expect(selReversed.selectedOffer?.product.originalUrl).toBe(candB.originalUrl);
    expect(selShuffled.selectedOffer?.product.originalUrl).toBe(candB.originalUrl);

    expect(selOriginal.selectionTier).toBe(selReversed.selectionTier);
    expect(selOriginal.selectionTier).toBe(selShuffled.selectionTier);

    expect(selOriginal.selectionReason).toBe(selReversed.selectionReason);
    expect(selOriginal.isFallbackRequired).toBe(selReversed.isFallbackRequired);
    expect(selOriginal.consideredOfferCount).toBe(3);
  });
});
