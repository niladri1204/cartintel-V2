import type { RankedDealResult, RankedOffer } from "./ranking";

export type RecommendationState = 
  | "recommended_deal" 
  | "current_product_is_best_price" 
  | "no_matching_offers" 
  | "currency_mismatch_prevents_recommendation"
  | "current_product_has_no_price";

export interface RecommendationResult {
  state: RecommendationState;
  recommendedOffer: RankedOffer | null;
  tiedOffers: RankedOffer[];
  reason: string;
  isPriceBased: boolean;
}

/**
 * Deal recommendation engine.
 */
export function recommendDeal(rankedDeals: RankedDealResult): RecommendationResult {
  if (!rankedDeals || !rankedDeals.currentProduct) {
    throw new Error("CartIntel Recommendation: Cannot recommend deals without a valid RankedDealResult.");
  }

  const currentProduct = rankedDeals.currentProduct;
  const currentPrice = currentProduct.originalPrice;

  // RULE 3: No external offers
  if (rankedDeals.offers.length === 0) {
    return {
      state: "no_matching_offers",
      recommendedOffer: null,
      tiedOffers: [],
      reason: "No matching marketplace offers were found.",
      isPriceBased: true
    };
  }

  // RULE 12: Current product has no valid price
  if (currentPrice === null) {
    return {
      state: "current_product_has_no_price",
      recommendedOffer: null,
      tiedOffers: [],
      reason: "Current product has no valid price. A cheaper-offer recommendation cannot be safely established.",
      isPriceBased: true
    };
  }

  // RULE 1: If rankedDeals.bestOffer exists (cheaper, matching variant, valid offer)
  if (rankedDeals.bestOffer) {
    const bestPrice = rankedDeals.bestOffer.product.originalPrice;
    
    // Find tied offers sharing the exact same best price
    const tiedOffers = rankedDeals.offers.filter(offer => 
      offer !== rankedDeals.bestOffer && 
      offer.product.originalPrice === bestPrice
    );

    tiedOffers.sort((a, b) => a.product.metadata.marketplace.localeCompare(b.product.metadata.marketplace));

    const savingsVal = rankedDeals.bestOffer.savingsValue ? Math.round(rankedDeals.bestOffer.savingsValue) : 0;
    const savingsPct = rankedDeals.bestOffer.savingsPercentage ? Math.round(rankedDeals.bestOffer.savingsPercentage) : 0;
    
    const reason = `Save ₹${savingsVal.toLocaleString()} (${savingsPct}%)`;

    return {
      state: "recommended_deal",
      recommendedOffer: rankedDeals.bestOffer,
      tiedOffers,
      reason,
      isPriceBased: true
    };
  }

  // RULE 2: No cheaper matching offer exists
  return {
    state: "current_product_is_best_price",
    recommendedOffer: null,
    tiedOffers: [],
    reason: "The current product is already the best price.",
    isPriceBased: true
  };
}
