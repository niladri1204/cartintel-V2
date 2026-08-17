import type {
  CanonicalProduct,
} from "./clusterTypes";

import {
  OfferNormalizer,
} from "./offerNormalizer";

import {
  ProductOfferNormalizer,
} from "./normalizedProduct";

import {
  FinalOfferRankingEngine,
} from "./finalOfferRankingEngine";

import {
  RankedProductBuilder,
} from "./rankedProductBuilder";

import {
  RankedProductEngine,
} from "./rankedProductEngine";

import type {
  RankedProductResult,
} from "./rankedProductTypes";

export class RankedDiscoveryPipeline {
  private readonly productNormalizer:
    ProductOfferNormalizer;

  private readonly rankedProductEngine:
    RankedProductEngine;

  constructor() {
    this.productNormalizer =
      new ProductOfferNormalizer(
        new OfferNormalizer()
      );

    this.rankedProductEngine =
      new RankedProductEngine(
        new FinalOfferRankingEngine(),

        new RankedProductBuilder()
      );
  }

  run(
    products: CanonicalProduct[]
  ): RankedProductResult[] {
    return products.map(
      product => {
        const normalized =
          this.productNormalizer
            .normalizeProduct(
              product
            );

        return this.rankedProductEngine
          .build(normalized);
      }
    );
  }
}
