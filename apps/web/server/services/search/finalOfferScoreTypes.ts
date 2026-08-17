export type OfferEligibility =
  | "ELIGIBLE"
  | "NOT_ELIGIBLE";

export interface FinalOfferScore {
  offerId: string;

  score: number;

  eligibility: OfferEligibility;

  rank: number;

  reasons: string[];
}

export interface FinalOfferRanking {
  offers: FinalOfferScore[];

  bestOfferId: string | null;

  cheapestOfferId: string | null;
}
