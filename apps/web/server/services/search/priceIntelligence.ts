import type {
  NormalizedOffer,
} from "./offerTypes";

import type {
  PriceFlag,
  PriceIntelligence,
} from "./priceIntelligenceTypes";

export function analyzePrice(
  offer: NormalizedOffer
): PriceIntelligence {
  const finalPrice =
    offer.pricing.finalPrice;

  const originalPrice =
    offer.pricing.originalPrice;

  const currency =
    offer.pricing.currency;

  const flags: PriceFlag[] = [];

  if (
    finalPrice === null ||
    !Number.isFinite(finalPrice)
  ) {
    flags.push("MISSING_PRICE");

    return {
      finalPrice: null,
      originalPrice,
      currency,

      confidence: "INVALID",

      flags,

      discountAmount: null,
      discountPercentage: null,
    };
  }

  if (finalPrice <= 0) {
    flags.push("NON_POSITIVE_PRICE");

    return {
      finalPrice,
      originalPrice,
      currency,

      confidence: "INVALID",

      flags,

      discountAmount: null,
      discountPercentage: null,
    };
  }

  if (!currency) {
    flags.push("UNKNOWN_CURRENCY");
  }

  if (
    originalPrice !== null &&
    originalPrice < finalPrice
  ) {
    flags.push(
      "ORIGINAL_PRICE_BELOW_FINAL"
    );
  }

  if (flags.includes(
    "ORIGINAL_PRICE_BELOW_FINAL"
  )) {
    return {
      finalPrice,
      originalPrice,
      currency,

      confidence: "LOW",

      flags,

      discountAmount: null,
      discountPercentage: null,
    };
  }

  const discountAmount =
    originalPrice !== null
      ? originalPrice - finalPrice
      : null;

  const discountPercentage =
    originalPrice !== null &&
    originalPrice > 0
      ? (
          discountAmount! /
          originalPrice
        ) * 100
      : null;

  return {
    finalPrice,
    originalPrice,
    currency,

    confidence:
      currency
        ? "HIGH"
        : "MEDIUM",

    flags: [
      "VALID",
      ...flags,
    ],

    discountAmount,

    discountPercentage:
      discountPercentage !== null
        ? Math.round(
            discountPercentage * 100
          ) / 100
        : null,
  };
}
