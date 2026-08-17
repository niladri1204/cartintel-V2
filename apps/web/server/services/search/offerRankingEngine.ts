import type {
  NormalizedOffer,
} from "./offerTypes";

import type {
  OfferRankingResult,
  RankedOffer,
} from "./offerRankingTypes";

import {
  scoreOffer,
} from "./offerRankingScorer";

import {
  evaluateOfferPrice,
} from "./offerPriceEvaluator";

export class OfferRankingEngine {
  rank(
    offers: NormalizedOffer[]
  ): OfferRankingResult {
    if (offers.length === 0) {
      return {
        offers: [],
        bestOfferId: null,
        cheapestOfferId: null,
      };
    }

    const evaluatedOffers =
      offers.map(
        evaluateOfferPrice
      );

    const availableOffers =
      evaluatedOffers.filter(
        evaluated =>
          (
            evaluated.offer.availability ===
              "IN_STOCK" ||
            evaluated.offer.availability ===
              "LOW_STOCK"
          ) &&
          evaluated.priceValid &&
          evaluated.comparablePrice !== null
      );

    const prices =
      availableOffers.map(
        evaluated =>
          evaluated.comparablePrice!
      );

    const lowestAvailablePrice =
      prices.length > 0
        ? Math.min(...prices)
        : null;

    const ranked: RankedOffer[] =
      offers.map(offer => {
        const result =
          scoreOffer(
            offer,
            lowestAvailablePrice
          );

        return {
          offerId: offer.id,

          rank: 0,

          score: result.score,

          reasons: result.reasons,
        };
      });

    ranked.sort(
      (a, b) =>
        b.score - a.score
    );

    ranked.forEach(
      (offer, index) => {
        offer.rank = index + 1;
      }
    );

    const cheapestOffer =
      availableOffers
        .slice()
        .sort(
          (a, b) =>
            a.comparablePrice! -
            b.comparablePrice!
        )[0];

    return {
      offers: ranked,

      bestOfferId:
        ranked[0]?.offerId ?? null,

      cheapestOfferId:
        cheapestOffer?.offer.id ?? null,
    };
  }
}
