import type {
  NormalizedOffer,
} from "./offerTypes";

import {
  analyzeAvailability,
} from "./availabilityIntelligence";

import type {
  AvailabilityConfidence,
} from "./availabilityIntelligenceTypes";

export interface EvaluatedAvailability {
  offer: NormalizedOffer;

  purchasable: boolean;

  availabilityConfidence:
    AvailabilityConfidence;

  status:
    | "IN_STOCK"
    | "LOW_STOCK"
    | "PREORDER"
    | "OUT_OF_STOCK"
    | "UNKNOWN";
}

export function evaluateOfferAvailability(
  offer: NormalizedOffer
): EvaluatedAvailability {
  const intelligence =
    analyzeAvailability(offer);

  return {
    offer,

    purchasable:
      intelligence.purchasable,

    availabilityConfidence:
      intelligence.confidence,

    status:
      intelligence.status,
  };
}
