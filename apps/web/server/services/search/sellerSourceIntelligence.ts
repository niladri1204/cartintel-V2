import type {
  NormalizedOffer,
} from "./offerTypes";

import {
  classifySource,
} from "./sourceClassifier";

import {
  classifySeller,
} from "./sellerClassifier";

import type {
  SellerSourceIntelligence,
} from "./sellerSourceTypes";

export function analyzeSellerSource(
  offer: NormalizedOffer
): SellerSourceIntelligence {
  const sourceType =
    classifySource(
      offer.source
    );

  const sellerInfo =
    classifySeller(
      offer.source,
      offer.seller
    );

  const flags: string[] = [];

  if (
    sourceType === "UNKNOWN"
  ) {
    flags.push(
      "UNKNOWN_SOURCE"
    );
  }

  if (
    sellerInfo.type === "THIRD_PARTY"
  ) {
    flags.push(
      "THIRD_PARTY_SELLER"
    );
  }

  if (
    sellerInfo.type === "PLATFORM"
  ) {
    flags.push(
      "PLATFORM_SELLER"
    );
  }

  return {
    source: offer.source,

    sourceType,

    seller:
      offer.seller ?? null,

    sellerType:
      sellerInfo.type,

    sourceConfidence:
      sourceType === "UNKNOWN"
        ? "LOW"
        : "HIGH",

    sellerConfidence:
      sellerInfo.confidence,

    flags,
  };
}
