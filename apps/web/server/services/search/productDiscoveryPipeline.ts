import {
  DiscoveryEngine,
} from "./discoveryEngine";

import {
  ProductIdentityEngine,
} from "./productIdentityEngine";

import {
  ProductClusterer,
} from "./productClusterer";
import type {
  ClusterCandidate,
} from "./productClusterer";

import type {
  SearchQueryInput,
} from "./queryGenerator";

import type {
  CanonicalProduct,
} from "./clusterTypes";

import {
  createCandidateId,
} from "./candidateId";

import type {
  IdentityCandidate,
} from "./identityTypes";

import {
  toIdentityCandidate,
} from "./identityCandidateAdapter";

export interface ProductDiscoveryResult {
  totalCandidates: number;

  acceptedCandidates: number;

  rejectedCandidates: number;

  products: CanonicalProduct[];
}

export class ProductDiscoveryPipeline {
  private readonly discoveryEngine: DiscoveryEngine;
  private readonly identityEngine: ProductIdentityEngine;
  private readonly clusterer: ProductClusterer;

  constructor(
    discoveryEngine: DiscoveryEngine,
    identityEngine: ProductIdentityEngine,
    clusterer: ProductClusterer
  ) {
    this.discoveryEngine = discoveryEngine;
    this.identityEngine = identityEngine;
    this.clusterer = clusterer;
  }

  async run(
    input: SearchQueryInput,
    sourceCandidate: IdentityCandidate
  ): Promise<ProductDiscoveryResult> {
    const discovery =
      await this.discoveryEngine.discover(
        input
      );

    let acceptedCandidates: ClusterCandidate[] =
      [];

    let rejectedCandidates = 0;

    for (const candidate of discovery.candidates) {
      const comparison =
        this.identityEngine.compare(
          sourceCandidate,
          toIdentityCandidate(candidate)
        );

      if (
        comparison.confidence ===
          "EXACT" ||
        comparison.confidence ===
          "HIGH_CONFIDENCE"
      ) {
        acceptedCandidates.push({
          ...candidate,
          id: createCandidateId(candidate),
        });
      } else {
        rejectedCandidates++;
      }
    }

    const products =
      this.clusterer.cluster(
        acceptedCandidates
      );

    return {
      totalCandidates:
        discovery.candidates.length,

      acceptedCandidates:
        acceptedCandidates.length,

      rejectedCandidates,

      products,
    };
  }
}
