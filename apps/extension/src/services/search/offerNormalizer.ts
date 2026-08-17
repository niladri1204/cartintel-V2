import type {
  ProductOffer,
} from "./clusterTypes";

import type {
  NormalizedOffer,
} from "./offerTypes";

import {
  normalizePrice,
  calculateDiscount,
} from "./priceNormalizer";

import {
  normalizeAvailability,
} from "./availabilityNormalizer";

export class OfferNormalizer {
  normalize(
    offer: ProductOffer,
    productId: string
  ): NormalizedOffer {
    const finalPrice =
      normalizePrice(
        offer.price
      );

    const originalPrice =
      null;

    const discount =
      calculateDiscount(
        originalPrice,
        finalPrice
      );

    return {
      id: offer.id,

      productId,

      source: offer.source,

      seller:
        offer.seller ?? null,

      title: offer.title,

      url: offer.url,

      imageUrl:
        offer.imageUrl ?? null,

      pricing: {
        finalPrice,

        originalPrice,

        currency:
          offer.currency ?? null,

        discountAmount:
          discount.amount,

        discountPercentage:
          discount.percentage,
      },

      availability:
        normalizeAvailability(
          offer.availability
        ),

      identity: {
        confidence:
          offer.identity.confidence,

        score:
          offer.identity.score,
      },

      normalizedAt:
        new Date().toISOString(),

      googleProductId: offer.googleProductId ?? null,
      googleImmersiveToken: offer.googleImmersiveToken ?? null,
      googleShoppingProductLink: offer.googleShoppingProductLink ?? null,
      marketplaceLogo: offer.marketplaceLogo ?? null,
      searchQuery: offer.searchQuery,
      searchRank: offer.searchRank,
      identifiers: offer.identifiers,
      rating: offer.rating ?? null,
      deliveryInfo: offer.deliveryInfo ?? null,
    };
  }
}


