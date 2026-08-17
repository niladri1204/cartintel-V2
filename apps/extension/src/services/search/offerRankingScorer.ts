import type {
  NormalizedOffer,
} from "./offerTypes";

import type {
  OfferRankReason,
} from "./offerRankingTypes";

import {
  analyzeSellerSource,
} from "./sellerSourceIntelligence";

export interface OfferScore {
  score: number;

  reasons: OfferRankReason[];
}

export function scoreOffer(
  offer: NormalizedOffer,
  lowestAvailablePrice: number | null
): OfferScore {
  let score = 0;

  const reasons: OfferRankReason[] = [];

  // -----------------------------------------
  // Availability
  // -----------------------------------------

  if (
    offer.availability === "IN_STOCK"
  ) {
    score += 40;

    reasons.push(
      "IN_STOCK"
    );
  }

  if (
    offer.availability === "LOW_STOCK"
  ) {
    score += 30;

    reasons.push(
      "LOW_STOCK"
    );
  }

  if (
    offer.availability === "PREORDER"
  ) {
    score += 15;

    reasons.push(
      "PREORDER"
    );
  }

  if (
    offer.availability === "OUT_OF_STOCK"
  ) {
    score -= 50;

    reasons.push(
      "OUT_OF_STOCK"
    );
  }

  if (
    offer.availability === "UNKNOWN"
  ) {
    score -= 10;

    reasons.push(
      "UNKNOWN_AVAILABILITY"
    );
  }

  // -----------------------------------------
  // Identity confidence
  // -----------------------------------------

  if (
    offer.identity.confidence ===
    "EXACT"
  ) {
    score += 20;

    reasons.push("EXACT_IDENTITY");
  }

  if (
    offer.identity.confidence ===
    "HIGH_CONFIDENCE"
  ) {
    score += 10;

    reasons.push("HIGH_IDENTITY_CONFIDENCE");
  }

  // -----------------------------------------
  // Price
  // -----------------------------------------

  if (
    offer.pricing.finalPrice !== null &&
    lowestAvailablePrice !== null &&
    lowestAvailablePrice > 0
  ) {
    const difference =
      offer.pricing.finalPrice -
      lowestAvailablePrice;

    if (difference === 0) {
      score += 40;

      reasons.push("LOWEST_PRICE");
    } else {
      const relativeDifference =
        difference /
        lowestAvailablePrice;

      if (relativeDifference <= 0.02) {
        score += 35;
      } else if (
        relativeDifference <= 0.05
      ) {
        score += 25;
      } else if (
        relativeDifference <= 0.10
      ) {
        score += 15;
      }
    }
  }

  // -----------------------------------------
  // Seller / Source
  // -----------------------------------------

  const sellerSource =
    analyzeSellerSource(offer);

  if (
    sellerSource.sellerType ===
    "PLATFORM"
  ) {
    score += 5;

    reasons.push(
      "PLATFORM_SELLER"
    );
  }

  if (
    sellerSource.sellerType ===
    "THIRD_PARTY"
  ) {
    reasons.push(
      "THIRD_PARTY_SELLER"
    );
  }

  if (
    sellerSource.sourceType ===
    "UNKNOWN"
  ) {
    score -= 5;

    reasons.push(
      "UNKNOWN_SOURCE"
    );
  }

  return {
    score,
    reasons,
  };
}
