import type {
  NormalizedOffer,
} from "./offerTypes";

import {
  evaluateOfferPrice,
} from "./offerPriceEvaluator";

import {
  calculateFinalOfferScore,
} from "./finalOfferScorer";

import type {
  FinalOfferRanking,
  FinalOfferScore,
} from "./finalOfferScoreTypes";

export class FinalOfferRankingEngine {
  rank(
    offers: NormalizedOffer[]
  ): FinalOfferRanking {
    if (offers.length === 0) {
      return {
        offers: [],
        bestOfferId: null,
        cheapestOfferId: null,
      };
    }

    const evaluated =
      offers.map(
        evaluateOfferPrice
      );

    const available =
      evaluated.filter(
        evaluation =>
          evaluation.priceValid &&
          (
            evaluation.offer
              .availability ===
              "IN_STOCK" ||
            evaluation.offer
              .availability ===
              "LOW_STOCK"
          ) &&
          evaluation.comparablePrice !==
            null
      );

    const prices =
      available.map(
        evaluation =>
          evaluation.comparablePrice!
      );

    const lowestAvailablePrice =
      prices.length > 0
        ? Math.min(...prices)
        : null;

    const ranked: FinalOfferScore[] =
      offers.map(
        offer =>
          calculateFinalOfferScore(
            offer,
            lowestAvailablePrice
          )
      );

    const eligible =
      ranked.filter(
        offer =>
          offer.eligibility ===
          "ELIGIBLE"
      );

    eligible.sort(
      (a, b) =>
        b.score - a.score
    );

    eligible.forEach(
      (offer, index) => {
        offer.rank = index + 1;
      }
    );

    const ineligible =
      ranked.filter(
        offer =>
          offer.eligibility ===
          "NOT_ELIGIBLE"
      );

    const finalOffers = [
      ...eligible,
      ...ineligible,
    ];

    const cheapest =
      available
        .slice()
        .sort(
          (a, b) =>
            a.comparablePrice! -
            b.comparablePrice!
        )[0];

    return {
      offers: finalOffers,

      bestOfferId:
        eligible[0]?.offerId ??
        null,

      cheapestOfferId:
        cheapest?.offer.id ??
        null,
    };
  }
}
