import type {
  NormalizedProduct,
} from "./normalizedProduct";

import type {
  FinalOfferRanking,
} from "./finalOfferScoreTypes";

import type {
  RankedOffer,
  RankedProductResult,
} from "./rankedProductTypes";

export class RankedProductBuilder {
  build(
    product: NormalizedProduct,
    ranking: FinalOfferRanking
  ): RankedProductResult {
    const rankingById =
      new Map(
        ranking.offers.map(
          result => [
            result.offerId,
            result,
          ]
        )
      );

    const rankedOffers: RankedOffer[] =
      product.offers.map(
        offer => {
          const offerRanking =
            rankingById.get(
              offer.id
            );

          if (!offerRanking) {
            return null;
          }

          return {
            offer,
            ranking: offerRanking,
          };
        }
      )
      .filter(
        (
          value
        ): value is RankedOffer =>
          value !== null
      );

    const purchasableOffers =
      rankedOffers.filter(
        item =>
          item.ranking.eligibility ===
          "ELIGIBLE"
      );

    const referenceOffers =
      rankedOffers.filter(
        item =>
          item.ranking.eligibility ===
          "NOT_ELIGIBLE"
      );

    const bestOffer =
      rankedOffers.find(
        item =>
          item.offer.id ===
          ranking.bestOfferId
      ) ?? null;

    const cheapestOffer =
      rankedOffers.find(
        item =>
          item.offer.id ===
          ranking.cheapestOfferId
      ) ?? null;

    return {
      product: {
        id: product.id,

        title: product.title,

        brand: product.brand,
        model: product.model,
        variant: product.variant,

        category: product.category,
        productType:
          product.productType,

        color: product.color,
        size: product.size,

        storage: product.storage,
        ram: product.ram,

        fingerprint:
          product.fingerprint,
      },

      bestOffer,

      cheapestOffer,

      offers:
        purchasableOffers,

      referenceOffers,

      generatedAt:
        new Date().toISOString(),
    };
  }
}
