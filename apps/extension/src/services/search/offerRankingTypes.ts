export type OfferRankReason =
  | "LOWEST_PRICE"
  | "IN_STOCK"
  | "LOW_STOCK"
  | "PREORDER"
  | "OUT_OF_STOCK"
  | "UNKNOWN_AVAILABILITY"
  | "EXACT_IDENTITY"
  | "HIGH_IDENTITY_CONFIDENCE"
  | "PLATFORM_SELLER"
  | "THIRD_PARTY_SELLER"
  | "UNKNOWN_SOURCE";

export interface RankedOffer {
  offerId: string;

  rank: number;

  score: number;

  reasons: OfferRankReason[];
}

export interface OfferRankingResult {
  offers: RankedOffer[];

  bestOfferId: string | null;

  cheapestOfferId: string | null;
}
