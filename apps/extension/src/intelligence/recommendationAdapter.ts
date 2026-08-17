import type { RankedDealResult } from "./ranking";
import type { RecommendationCandidate } from "./recommendationTypes";

/**
 * Converts a RankedDealResult into an array of RecommendationCandidates,
 * serving as a structural bridge between the ranking pipeline and the recommendation layer.
 */
export function toRecommendationCandidates(
  rankedDeals: RankedDealResult | null | undefined
): RecommendationCandidate[] {
  if (!rankedDeals || !Array.isArray(rankedDeals.offers) || rankedDeals.offers.length === 0) {
    return [];
  }

  return rankedDeals.offers.map((offer) => {
    // Determine if this offer is the selected best offer
    const isSelectedBestOffer = 
      rankedDeals.bestListingDetails?.selectedOffer === offer ||
      rankedDeals.bestOffer === offer;

    const selectionTier = isSelectedBestOffer
      ? (rankedDeals.bestListingDetails?.selectionTier ?? null)
      : null;

    // Reuse the existing RankedOffer properties exactly, appending selectionTier
    const candidate: RecommendationCandidate = {
      ...offer,
      selectionTier
    };

    return candidate;
  });
}
