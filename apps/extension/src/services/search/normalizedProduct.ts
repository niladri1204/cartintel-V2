import type {
  CanonicalProduct,
} from "./clusterTypes";

import type {
  NormalizedOffer,
} from "./offerTypes";

import {
  OfferNormalizer,
} from "./offerNormalizer";

export interface NormalizedProduct {
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

  offers: NormalizedOffer[];
}

export class ProductOfferNormalizer {
  private readonly offerNormalizer: OfferNormalizer;

  constructor(
    offerNormalizer: OfferNormalizer
  ) {
    this.offerNormalizer = offerNormalizer;
  }

  normalizeProduct(
    product: CanonicalProduct
  ): NormalizedProduct {
    return {
      id: product.id,

      title: product.title,

      brand: product.brand ?? null,
      model: product.model ?? null,
      variant: product.variant ?? null,

      category:
        product.category ?? null,

      productType:
        product.productType ?? null,

      color: product.color ?? null,
      size: product.size ?? null,

      storage:
        product.storage ?? null,

      ram:
        product.ram ?? null,

      fingerprint:
        product.fingerprint ?? null,

      offers: product.offers.map(
        offer =>
          this.offerNormalizer.normalize(
            offer,
            product.id
          )
      ),
    };
  }
}
