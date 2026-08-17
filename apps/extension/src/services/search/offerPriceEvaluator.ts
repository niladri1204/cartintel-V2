import type {
  NormalizedOffer,
} from "./offerTypes";

import {
  analyzePrice,
} from "./priceIntelligence";

export interface EvaluatedOffer {
  offer: NormalizedOffer;

  priceValid: boolean;

  priceConfidence:
    | "HIGH"
    | "MEDIUM"
    | "LOW"
    | "INVALID";

  comparablePrice: number | null;
}

export function evaluateOfferPrice(
  offer: NormalizedOffer
): EvaluatedOffer {
  const intelligence =
    analyzePrice(offer);

  const priceValid =
    intelligence.confidence !==
    "INVALID";

  return {
    offer,

    priceValid,

    priceConfidence:
      intelligence.confidence,

    comparablePrice:
      priceValid
        ? intelligence.finalPrice
        : null,
  };
}
