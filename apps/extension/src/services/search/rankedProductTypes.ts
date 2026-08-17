import type {
  NormalizedOffer,
} from "./offerTypes";

import type {
  FinalOfferScore,
} from "./finalOfferScoreTypes";

export interface RankedOffer {
  offer: NormalizedOffer;
  ranking: FinalOfferScore;
}

export interface RankedProductResult {
  product: {
    id: string;

    title: string;

    brand: string | null;
    model: string | null;
    variant: string | null;

    category: string | null;
    productType: string | null;

    color: string | null;
    size: string | null;

    storage: string | null;
    ram: string | null;

    fingerprint: string | null;
  };

  bestOffer: RankedOffer | null;

  cheapestOffer: RankedOffer | null;

  offers: RankedOffer[];

  referenceOffers: RankedOffer[];

  generatedAt: string;
}
