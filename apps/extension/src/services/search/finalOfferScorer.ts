import type {
  NormalizedOffer,
} from "./offerTypes";

import {
  evaluateOfferPrice,
} from "./offerPriceEvaluator";

import {
  evaluateOfferAvailability,
} from "./offerAvailabilityEvaluator";

import {
  analyzeSellerSource,
} from "./sellerSourceIntelligence";

import type {
  FinalOfferScore,
} from "./finalOfferScoreTypes";

export function calculateFinalOfferScore(
  offer: NormalizedOffer,
  lowestAvailablePrice: number | null
): FinalOfferScore {
  const price =
    evaluateOfferPrice(offer);

  const availability =
    evaluateOfferAvailability(offer);

  const sellerSource =
    analyzeSellerSource(offer);

  // -----------------------------------------
  // HARD ELIGIBILITY
  // -----------------------------------------

  if (!price.priceValid) {
    return {
      offerId: offer.id,

      score: 0,

      eligibility: "NOT_ELIGIBLE",

      rank: 0,

      reasons: [
        "Invalid price",
      ],
    };
  }

  if (
    availability.status ===
    "OUT_OF_STOCK"
  ) {
    return {
      offerId: offer.id,

      score: 0,

      eligibility: "NOT_ELIGIBLE",

      rank: 0,

      reasons: [
        "Out of stock",
      ],
    };
  }

  // -----------------------------------------
  // BASE SCORE
  // -----------------------------------------

  let score = 0;

  const reasons: string[] = [];

  // -----------------------------------------
  // Identity
  // -----------------------------------------

  if (
    offer.identity.confidence ===
    "EXACT"
  ) {
    score += 20;

    reasons.push(
      "Exact product identity"
    );
  } else if (
    offer.identity.confidence ===
    "HIGH_CONFIDENCE"
  ) {
    score += 10;

    reasons.push(
      "High-confidence identity"
    );
  }

  // -----------------------------------------
  // Availability
  // -----------------------------------------

  if (
    availability.status ===
    "IN_STOCK"
  ) {
    score += 40;

    reasons.push(
      "In stock"
    );
  }

  if (
    availability.status ===
    "LOW_STOCK"
  ) {
    score += 30;

    reasons.push(
      "Low stock"
    );
  }

  if (
    availability.status ===
    "PREORDER"
  ) {
    score += 15;

    reasons.push(
      "Preorder available"
    );
  }

  // -----------------------------------------
  // Price
  // -----------------------------------------

  if (
    price.comparablePrice !== null &&
    lowestAvailablePrice !== null
  ) {
    const difference =
      price.comparablePrice -
      lowestAvailablePrice;

    if (difference === 0) {
      score += 40;

      reasons.push(
        "Lowest available price"
      );
    } else {
      const relativeDifference =
        difference /
        lowestAvailablePrice;

      if (relativeDifference <= 0.02) {
        score += 35;

        reasons.push(
          "Within 2% of lowest price"
        );
      } else if (
        relativeDifference <= 0.05
      ) {
        score += 25;

        reasons.push(
          "Within 5% of lowest price"
        );
      } else if (
        relativeDifference <= 0.10
      ) {
        score += 15;

        reasons.push(
          "Within 10% of lowest price"
        );
      }
    }
  }

  // -----------------------------------------
  // Seller / Source
  // -----------------------------------------

  if (
    sellerSource.sellerType ===
    "PLATFORM"
  ) {
    score += 5;

    reasons.push(
      "Platform seller"
    );
  }

  if (
    sellerSource.sourceType ===
    "UNKNOWN"
  ) {
    score -= 5;

    reasons.push(
      "Unknown source"
    );
  }

  return {
    offerId: offer.id,

    score,

    eligibility: "ELIGIBLE",

    rank: 0,

    reasons,
  };
}
