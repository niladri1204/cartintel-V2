import type {
  NormalizedProduct,
} from "./normalizedProduct";

import {
  FinalOfferRankingEngine,
} from "./finalOfferRankingEngine";

import {
  RankedProductBuilder,
} from "./rankedProductBuilder";

import type {
  RankedProductResult,
} from "./rankedProductTypes";

export class RankedProductEngine {
  private readonly rankingEngine: FinalOfferRankingEngine;
  private readonly builder: RankedProductBuilder;

  constructor(
    rankingEngine: FinalOfferRankingEngine,
    builder: RankedProductBuilder
  ) {
    this.rankingEngine = rankingEngine;
    this.builder = builder;
  }

  build(
    product: NormalizedProduct
  ): RankedProductResult {
    const ranking =
      this.rankingEngine.rank(
        product.offers
      );

    return this.builder.build(
      product,
      ranking
    );
  }
}
