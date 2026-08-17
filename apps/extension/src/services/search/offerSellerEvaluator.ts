import type {
  NormalizedOffer,
} from "./offerTypes";

import {
  analyzeSellerSource,
} from "./sellerSourceIntelligence";

import type {
  SellerSourceIntelligence,
} from "./sellerSourceTypes";

export interface EvaluatedSellerSource {
  offer: NormalizedOffer;

  intelligence:
    SellerSourceIntelligence;
}

export function evaluateOfferSellerSource(
  offer: NormalizedOffer
): EvaluatedSellerSource {
  return {
    offer,

    intelligence:
      analyzeSellerSource(
        offer
      ),
  };
}
