import type {
  NormalizedOffer,
} from "./offerTypes";

import type {
  AvailabilityIntelligence,
} from "./availabilityIntelligenceTypes";

export function analyzeAvailability(
  offer: NormalizedOffer
): AvailabilityIntelligence {
  switch (offer.availability) {
    case "IN_STOCK":
      return {
        status: "IN_STOCK",

        confidence: "HIGH",

        purchasable: true,

        flags: [
          "AVAILABLE",
        ],
      };

    case "LOW_STOCK":
      return {
        status: "LOW_STOCK",

        confidence: "HIGH",

        purchasable: true,

        flags: [
          "AVAILABLE",
          "LOW_STOCK",
        ],
      };

    case "PREORDER":
      return {
        status: "PREORDER",

        confidence: "HIGH",

        purchasable: true,

        flags: [
          "PREORDER",
        ],
      };

    case "OUT_OF_STOCK":
      return {
        status: "OUT_OF_STOCK",

        confidence: "HIGH",

        purchasable: false,

        flags: [
          "UNAVAILABLE",
        ],
      };

    case "UNKNOWN":
    default:
      return {
        status: "UNKNOWN",

        confidence: "LOW",

        purchasable: false,

        flags: [
          "UNKNOWN",
        ],
      };
  }
}
